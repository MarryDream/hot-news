import { NewsService } from "#/hot-news/module/news/NewsService";
import { segment, Sendable } from "icqq";
import { wait } from "#/hot-news/util/tools";
import { config } from "#/hot-news/init";
import bot from "ROOT";
import { DB_KEY } from "#/hot-news/util/constants";
import { ChatInfo } from "#/hot-news/types/type";
import { MessageMethod } from "#/hot-news/module/message/MessageMethod";
import { get60s } from "#/hot-news/util/api";

/**
 * 60s看到世界新闻，返回一张图片
 */
export class SixtySecondsWatchNews implements NewsService {
	async getInfo( channel?: string ): Promise<Sendable> {
		const api = await get60s();
		return segment.image( api, true, 60 );
	}
	
	async handler(): Promise<void> {
		const set: string[] = await bot.redis.getSet( DB_KEY.ids );
		if ( set.length === 0 ) {
			return;
		}
		
		let msg: Sendable = "";
		try {
			msg = await this.getInfo();
		} catch ( e ) {
			bot.logger.info( `[hot-news] 获取60s新闻图error.`, e );
			return;
		}
		
		let i = 0;
		for ( let id of set ) {
			const { type, targetId }: ChatInfo = JSON.parse( id );
			
			let channel = await bot.redis.getHashField( DB_KEY.channel, `${ targetId }` );
			if ( !channel ) {
				continue;
			}
			channel = channel.startsWith( "[" ) ? channel : `["${ channel }"]`;
			const channels: string[] = JSON.parse( channel ) || "[]";
			if ( channels.includes( "60sNews" ) ) {
				bot.logger.info( `[hot-news] - [${ targetId }] - 获取到60s新闻图: `, msg );
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