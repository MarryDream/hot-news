import { NewsService } from "#/hot-news/module/news/NewsService";
import { segment, Sendable } from "icqq"
import bot from "ROOT";
import { DB_KEY } from "#/hot-news/util/constants";
import { ChatInfo } from "#/hot-news/types/type";
import { MessageMethod } from "#/hot-news/module/message/MessageMethod";
import { getMoyuImg, getMoyuUrl } from "#/hot-news/util/api";
import { config } from "#/hot-news/init";
import { wait } from "#/hot-news/util/tools";

export class MessAroundServiceImpl implements NewsService {
	
	async getInfo( channel?: string ): Promise<Sendable> {
		let url;
		if ( config.subscribeMoyu.apiType === 1 ) {
			url = await getMoyuImg();
		} else {
			url = getMoyuUrl();
		}
		
		if ( url ) {
			return segment.image( url, true, 60 );
		}
		return '未获取到摸鱼日报';
	}
	
	async handler(): Promise<void> {
		const set: string[] = await bot.redis.getSet( DB_KEY.ids );
		if ( set.length === 0 ) {
			return;
		}
		
		const msg = await this.getInfo();
		bot.logger.info( `[hot-news]获取到今日摸鱼日报: `, msg );
		let i = 0;
		for ( let id of set ) {
			const { type, targetId }: ChatInfo = JSON.parse( id );
			
			let channel = await bot.redis.getHashField( DB_KEY.channel, `${ targetId }` );
			if ( !channel ) {
				continue;
			}
			channel = channel.startsWith( "[" ) ? channel : `["${ channel }"]`;
			const channels: string[] = JSON.parse( channel ) || "[]";
			if ( channels.includes( "moyu" ) ) {
				await MessageMethod.sendMsg( type, targetId, msg );
				i++;
				if ( config.pushLimit.enable && i > config.pushLimit.limitTimes ) {
					await wait( config.pushLimit.limitTime * 1000 );
					i = 0;
				}
			}
		}
	}
	
}