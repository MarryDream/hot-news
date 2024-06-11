import { NewsService } from "#/hot-news/module/news/NewsService";
import { segment, Sendable } from "@/modules/lib"
import bot from "ROOT";
import { DB_KEY } from "#/hot-news/util/constants";
import { MessageMethod } from "#/hot-news/module/message/MessageMethod";
import { getMoyuImg, getMoyuUrl } from "#/hot-news/util/api";
import { config } from "#/hot-news/init";
import { getTargetQQMap } from "#/hot-news/util/format";

export class MessAroundServiceImpl implements NewsService {

	async getInfo( channel?: string ): Promise<Sendable> {
		let url;
		if ( config.subscribeMoyu.apiType === 1 ) {
			url = await getMoyuImg();
		} else {
			url = getMoyuUrl();
		}

		if ( url ) {
			return segment.image( url );
		}
		return '未获取到摸鱼日报';
	}

	async handler(): Promise<void> {
		const subs = await bot.redis.getHash( DB_KEY.channel );
		const channel_qq_map = getTargetQQMap<string>( subs, value => {
			return value.startsWith( "[" ) ? value : `["${ value }"]`;
		} );

		const qq_list = channel_qq_map.get( "moyu" );

		// 没有人订阅摸鱼日报就不用去查信息了
		if ( !qq_list?.size ) return;

		const msg = await this.getInfo();
		bot.logger.info( `[hot-news] 获取到今日摸鱼日报: `, msg );
		for ( const qq of qq_list ) {
			const type = await bot.redis.getHashField( DB_KEY.subscribe_chat_info_key, qq );
			await MessageMethod.sendMsg( parseInt( type ), parseInt( qq ), msg );
		}
	}

}