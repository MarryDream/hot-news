import { NewsService } from "#/hot-news/module/news/NewsService";
import { segment, Sendable } from "@/modules/lib";
import bot from "ROOT";
import { DB_KEY } from "#/hot-news/util/constants";
import { MessageMethod } from "#/hot-news/module/message/MessageMethod";
import { get60s } from "#/hot-news/util/api";
import { getTargetQQMap } from "#/hot-news/util/format";

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
		const channel_qq_map = getTargetQQMap<string>( subs, value => {
			return value.startsWith( "[" ) ? value : `["${ value }"]`;
		} );

		const qq_list = channel_qq_map.get( "60sNews" );

		if ( !qq_list?.size ) return;

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