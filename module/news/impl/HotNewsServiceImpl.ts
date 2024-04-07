import { NewsService } from "#/hot-news/module/news/NewsService";
import { getNews } from "#/hot-news/util/api";
import { CHANNEL_NAME, DB_KEY } from "#/hot-news/util/constants";
import bot from "ROOT";
import { MessageMethod } from "#/hot-news/module/message/MessageMethod";
import { Sendable } from "@/modules/lib";

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
		
		const news_channel = [ "toutiao", "sina", "wangyi", "zhihu", "baidu" ];
		for ( let channel of all_sub ) {
			if ( !news_channel.includes( channel ) ) continue;
			const news = await getNews( channel );
			bot.logger.info( `[hot-news] - 获取到 [${ CHANNEL_NAME[channel] }] 新闻` );
			for ( const qq of qq_list ) {
				const type = await bot.redis.getHashField( DB_KEY.subscribe_chat_info_key, qq );
				await MessageMethod.sendMsg( parseInt( type ), parseInt( qq ), news );
			}
		}
	}
	
	
}