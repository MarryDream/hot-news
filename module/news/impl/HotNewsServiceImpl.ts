import { NewsService } from "#/hot-news/module/news/NewsService";
import { getNews } from "#/hot-news/util/api";
import { CHANNEL_NAME, DB_KEY } from "#/hot-news/util/constants";
import { ChatInfo } from "#/hot-news/types/type";
import bot from "ROOT";
import { MessageMethod } from "#/hot-news/module/message/MessageMethod";
import { config } from "#/hot-news/init";
import { wait } from "#/hot-news/util/tools";
import { Sendable } from "icqq";

/**
 * 热点新闻服务
 */
export class HotNewsServiceImpl implements NewsService {
	
	getInfo( channel?: string ): Promise<Sendable> {
		if ( channel ) {
			return getNews( `${ channel }` );
		}
		
		throw '[HotNewsServiceImpl]#/getInfo的channel为必须参数';
	}
	
	async handler(): Promise<void> {
		const set: string[] = await bot.redis.getSet( DB_KEY.ids );
		if ( set.length === 0 ) {
			return;
		}
		const news_channel = [ "toutiao", "sina", "wangyi", "zhihu", "baidu" ];
		let i = 0;
		for ( let id of set ) {
			const { type, targetId }: ChatInfo = JSON.parse( id );
			
			let channel = await bot.redis.getHashField( DB_KEY.channel, `${ targetId }` );
			if ( !channel ) {
				continue;
			}
			channel = channel.startsWith( "[" ) ? channel : `["${ channel }"]`
			
			let channels: string[] = JSON.parse( channel );
			
			channels = channels.filter( c => news_channel.includes( c ) );
			if ( channels.length < 1 ) {
				continue;
			}
			for ( let c of channels ) {
				const news = await getNews( c );
				bot.logger.info( `[hot-news] - [${ targetId }] - 获取到 [${ CHANNEL_NAME[c] }] 新闻` );
				await MessageMethod.sendMsg( type, targetId, news );
			}
			
			// 对消息推送进行限制，超过限制的消息需要延迟推送
			i++;
			if ( config.pushLimit.enable && i > config.pushLimit.limitTimes ) {
				await wait( config.pushLimit.limitTime * 1000 );
				i = 0;
			}
		}
	}
	
	
}