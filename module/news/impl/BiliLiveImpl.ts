import { NewsService } from "#/hot-news/module/news/NewsService";
import { ImageElem, segment, Sendable } from "@/modules/lib";
import { DB_KEY } from "#/hot-news/util/constants";
import { BiliLiveInfo } from "#/hot-news/types/type";
import { getBiliLiveStatus } from "#/hot-news/util/api";
import { msToHumanize } from "#/hot-news/util/tools";
import { RenderResult } from "@/modules/renderer";
import { config, renderer } from "#/hot-news/init";
import { MessageMethod } from "#/hot-news/module/message/MessageMethod";
import bot from "ROOT";
import { MessageType } from "@/modules/message";
import { Viewport } from "puppeteer";

export class BiliLiveImpl implements NewsService {
	private readonly viewPort: Viewport = {
		width: 2000,
		height: 1000,
		deviceScaleFactor: 3
	}
	
	async getInfo( channel?: string ): Promise<Sendable> {
		return "";
	}
	
	async handler(): Promise<void> {
		const subs = await bot.redis.getHash( DB_KEY.notify_bili_ids_key );
		const all_subs: string[] = Object.values( subs );
		const qq_list: string[] = Object.keys( subs );
		if ( all_subs.length === 0 ) return;
		
		const uidList: Set<number> = new Set<number>(
			all_subs.flatMap( value => JSON.parse( value ) )
		);
		
		for ( const uid of uidList ) {
			// B站直播推送
			const number = await bot.redis.getListLength( DB_KEY.bili_live_notified_list_key + uid );
			const live: BiliLiveInfo | undefined = await getBiliLiveStatus( uid );
			// 查询异常跳过
			if ( !live ) continue;
			
			if ( number < qq_list.length && live.liveRoom?.liveStatus === 1 ) {
				// 直播开始
				bot.logger.info( `[hot-news] UID:${ uid }(${ live.name })的直播开始了，标题: ${ live.liveRoom.title }` );
				const {
					name,
					liveRoom: { title, url, cover, watched_show: { num, text_large, text_small }, live_time }
				} = live;
				// 缓存直播间信息用来截图
				await bot.redis.setString( DB_KEY.bili_live_status_key + "." + uid, JSON.stringify( live ), 60 );
				const liveTime: string = live_time === 0 ? "00:00:00" : msToHumanize( Date.now() - live_time * 1000 );
				const cacheTime: number = config.biliLiveCacheTime * 60 * 60;
				let img: ImageElem = segment.image( cover );
				if ( config.screenshotType === 2 ) {
					const res: RenderResult = await renderer.asSegment(
						"/live/index.html",
						{ uid: uid },
						this.viewPort
					);
					if ( res.code === "ok" ) {
						img = <ImageElem>res.data;
					} else {
						bot.logger.error( res.error );
					}
				}
				const params: Record<string, any> = {
					name,
					title,
					url,
					img,
					num,
					text_large,
					text_small,
					liveTime
				}
				
				const msg: Sendable = MessageMethod.parseTemplate( config.liveTemplate, params );
				for ( let qq of qq_list ) {
					// 判断是否已推送直播间信息
					const isExist = await bot.redis.existListElement( DB_KEY.bili_live_status_key, qq );
					if ( isExist ) continue;
					
					// 获取用户的类型（群/私聊）
					const type = await bot.redis.getHashField( DB_KEY.subscribe_chat_info_key, qq );
					if ( type !== "0" && type !== "1" ) {
						bot.logger.warn( `[hot-news] [${ qq }]的用户类型(${ type })错误，无法发送动态消息` );
						continue;
					}
					
					// 判断是否运行 at 全体
					let userID: number | "all" | string = -1;
					if ( parseInt( type ) === MessageType.Group ) {
						const key = `${ DB_KEY.notify_at_all_up_key }${ qq }`;
						userID = await bot.redis.existListElement( key, uid ) ? "all" : -1;
					}
					await MessageMethod.sendMsg( parseInt( type ), parseInt( qq ), msg, userID );
					
					// 缓存已推送的 QQ
					await bot.redis.addListElement( `${ DB_KEY.bili_live_notified_list_key }${ uid }`, qq );
				}
				// 缓存直播间信息给结束直播时使用
				await bot.redis.setString( `${ DB_KEY.bili_live_notified }.${ uid }`, JSON.stringify( live ), cacheTime );
				await bot.redis.setTimeout( `${ DB_KEY.bili_live_notified_list_key }${ uid }`, cacheTime );
				continue;
			}
			
			// 直播结束
			if ( number >= qq_list.length && ( live?.liveRoom?.liveStatus === 0 || live.liveRoom?.liveStatus === 2 ) ) {
				const notification_status: string = await bot.redis.getString( `${ DB_KEY.bili_live_notified }.${ uid }` ) || "{}";
				const cache_live: BiliLiveInfo = JSON.parse( notification_status );
				const live_time: number = cache_live?.liveRoom?.live_time || 0;
				await bot.redis.deleteKey( `${ DB_KEY.bili_live_notified }.${ uid }` );
				await bot.redis.deleteKey( `${ DB_KEY.bili_live_notified_list_key }${ uid }` );
				const liveTime: string = live_time === 0 ? "00:00:00" : msToHumanize( Date.now() - live_time * 1000 );
				bot.logger.info( `[hot-news] UID:${ uid }(${ live.name })的直播结束了，本次直播时长: ${ liveTime }` );
			}
		}
	}
	
}