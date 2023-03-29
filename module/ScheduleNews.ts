import { cancelJob, Job, scheduleJob } from "node-schedule";
import { randomInt } from "#genshin/utils/random";
import { CHANNEL_NAME, DB_KEY } from "#hot-news/util/constants";
import { getBiliDynamicNew } from "#hot-news/util/api";
import { BOT } from "@modules/bot";
import { scheduleNews } from "#hot-news/init";
import NewsConfig from "#hot-news/module/NewsConfig";
import { NewsServiceFactory } from "#hot-news/module/NewsServiceFactory";
import { RefreshCatch } from "@modules/management/refresh";

export class ScheduleNews {
	private readonly bot: BOT;
	private readonly config: NewsConfig;
	
	public constructor( bot: BOT, config: NewsConfig ) {
		this.bot = bot;
		this.config = config;
	}
	
	public async refresh(): Promise<string> {
		try {
			cancelJob( "hot-news-bilibili-dynamic-job" );
			cancelJob( "hot-news-bilibili-live-job" );
			cancelJob( "hot-news-moyu-job" );
			
			this.initSchedule();
			this.bot.logger.info( "[hot-news]定时任务重新创建完成" );
			return `[hot-news]定时任务重新创建完成`;
		} catch ( error ) {
			throw <RefreshCatch>{
				log: ( <Error>error ).stack,
				msg: `[hot-news]定时任务重新创建失败，请前往控制台查看日志`
			};
		}
	}
	
	public createNewsSchedule(): void {
		scheduleJob( "hot-news", "0 30 8 * * *", async () => {
			const sec: number = randomInt( 0, 180 );
			const time = new Date().setSeconds( sec * 10 );
			
			const job: Job = scheduleJob( time, async () => {
				NewsServiceFactory.instance( CHANNEL_NAME.toutiao ).handler().then( () => {
					this.bot.logger.debug( "[hot-news] 每日热点新闻定时任务已处理完成." );
				} );
				NewsServiceFactory.instance( CHANNEL_NAME["60sNews"] ).handler().then( () => {
					this.bot.logger.debug( "[hot-news] 60s新闻定时任务已处理完成." );
				} );
				job.cancel();
			} );
		} );
		this.bot.logger.info( "[hot-news] 每日热点新闻定时任务已创建完成..." );
	}
	
	public initSchedule(): void {
		/* 创建原神动态定时任务 */
		scheduleNews.createBiliSchedule();
		
		if ( this.config.subscribeMoyu.enable ) {
			scheduleJob( "hot-news-moyu-job", this.config.subscribeMoyu.cronRule, async () => {
				await NewsServiceFactory.instance( CHANNEL_NAME.moyu ).handler();
			} );
			this.bot.logger.info( "[hot-news] 摸鱼日报定时任务已创建完成" );
		}
	}
	
	public createBiliSchedule(): void {
		// B站动态定时轮询任务
		scheduleJob( "hot-news-bilibili-dynamic-job", this.config.biliDynamicScheduleRule, async () => {
			await this.notifyBiliDynamic();
		} );
		this.bot.logger.info( "[hot-news] [bilibili-dynamic-job] B站动态定时任务已创建完成..." );
		
		// B站直播定时轮询任务
		scheduleJob( "hot-news-bilibili-live-job", this.config.biliLiveScheduleRule, async () => {
			await this.notifyBiliLive();
		} );
		this.bot.logger.info( "[hot-news] [bilibili-live-job] B站直播定时任务已创建完成..." );
	}
	
	public async initBiliDynamic( uid: number ): Promise<void> {
		this.bot.logger.info( `[hot-news] 开始初始化B站[${ uid }]动态数据...` )
		const dynamic_list = await getBiliDynamicNew( uid, true );
		if ( dynamic_list.length > 0 ) {
			const ids: string[] = dynamic_list.map( d => d.id_str );
			await this.bot.redis.addSetMember( `${ DB_KEY.bili_dynamic_ids_key }.${ uid }`, ...ids );
		}
		this.bot.logger.info( `[hot-news] 初始化B站[${ uid }]动态数据完成.` );
	}
	
	public async initAllBiliDynamic(): Promise<void> {
		this.bot.logger.info( `[hot-news]开始初始化B站所有已订阅的UP主的动态数据...` )
		const allSubsIds: { [key: string]: string } = await this.bot.redis.getHash( DB_KEY.notify_bili_ids_key );
		const uidList: number[] = [];
		const uidStrList = Object.values( allSubsIds ) || [];
		for ( let value of uidStrList ) {
			const uids: number[] = JSON.parse( value );
			uidList.push( ...uids );
		}
		
		for ( let uid of uidList ) {
			await this.initBiliDynamic( uid );
		}
		this.bot.logger.info( `[hot-news] 初始化B站所有已订阅的UP主的动态数据完成` )
	}
	
	private async notifyBiliDynamic(): Promise<void> {
		await NewsServiceFactory.instance( "biliDynamic" ).handler();
	}
	
	private async notifyBiliLive(): Promise<void> {
		await NewsServiceFactory.instance( "biliLive" ).handler();
	}
}