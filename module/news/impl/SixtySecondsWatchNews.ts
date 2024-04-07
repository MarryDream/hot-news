import { NewsService } from "#/hot-news/module/news/NewsService";
import { segment, Sendable } from "@/modules/lib";
import bot from "ROOT";
import { DB_KEY } from "#/hot-news/util/constants";
import { MessageMethod } from "#/hot-news/module/message/MessageMethod";
import { get60s } from "#/hot-news/util/api";

/**
 * 60s看到世界新闻，返回一张图片
 */
export class SixtySecondsWatchNews implements NewsService {
	async getInfo( channel?: string ): Promise<Sendable> {
		const api = await get60s();
		return segment.image( api );
	}
	
	async handler(): Promise<void> {
		const subs = await bot.redis.getHash( DB_KEY.channel );
		const all_subs: string[] = Object.values( subs );
		const qq_list: string[] = Object.keys( subs );
		if ( all_subs.length === 0 ) return;
		
		const all_sub: Set<string> = new Set<string>(
			all_subs.flatMap( value => {
				value = value.startsWith( "[" ) ? value : `["${ value }"]`;
				return JSON.parse( value ) || [];
			} )
		);
		
		if ( !all_sub.has( "60sNews" ) ) return;
		
		let msg: Sendable = "";
		try {
			msg = await this.getInfo();
		} catch ( e ) {
			bot.logger.info( `[hot-news] 获取60s新闻图error.`, e );
			return;
		}
		
		bot.logger.info( `[hot-news] - 获取到60s新闻图: `, msg );
		for ( const qq of qq_list ) {
			const type = await bot.redis.getHashField( DB_KEY.subscribe_chat_info_key, qq );
			await MessageMethod.sendMsg( parseInt( type ), parseInt( qq ), msg );
		}
	}
	
}