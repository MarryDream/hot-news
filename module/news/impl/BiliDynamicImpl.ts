import { NewsService } from "#/hot-news/module/news/NewsService";
import { Sendable } from "@/modules/lib";
import {
	BiliDynamicCard,
	BiliDynamicMajorArchive,
	BiliDynamicMajorArticle,
	BiliDynamicMajorOpus,
	DynamicInfo
} from "#/hot-news/types/type";
import { DB_KEY } from "#/hot-news/util/constants";
import { getBiliDynamicNew } from "#/hot-news/util/api";
import { formatTimestamp, wait } from "#/hot-news/util/tools";
import { config, renderer } from "#/hot-news/init";
import bot from "ROOT";
import { MessageMethod } from "#/hot-news/module/message/MessageMethod";
import { RenderResult } from "@/modules/renderer";
import { ScreenshotService } from "#/hot-news/module/screenshot/ScreenshotService";
import { Viewport } from "puppeteer";
import { getTargetQQMap } from "#/hot-news/util/format";

export class BiliDynamicImpl implements NewsService {
	private readonly viewPort: Viewport = {
		width: 2000,
		height: 1000,
		deviceScaleFactor: 2
	}
	
	async getInfo( _channel?: string ): Promise<Sendable> {
		return "";
	}
	
	async handler(): Promise<void> {
		const subs = await bot.redis.getHash( DB_KEY.notify_bili_ids_key );
		const uid_qq_map = getTargetQQMap<number>( subs );
		
		if ( !uid_qq_map.size ) return;
		
		for ( const [ uid, qq_list ] of uid_qq_map ) {
			// B站动态信息推送
			const cards: BiliDynamicCard[] = await getBiliDynamicNew( uid );
			
			for ( let card of cards ) {
				const { name, mid: uid, pub_time, pub_ts } = card.modules.module_author;
				const {
					comment: { count: comment_num },
					like: { count: like_num },
					forward: { count: forward_num }
				} = card.modules.module_stat;
				const pub_tsm: number = pub_ts * 1000;
				const pub_tss: string = formatTimestamp( pub_tsm );
				// 把新的动态ID加入本地数据库
				await bot.redis.addSetMember( `${ DB_KEY.bili_dynamic_ids_key }.${ uid }`, card.id_str );
				
				// 把动态信息缓存，后续渲染截图需要使用
				await bot.redis.setString( `${ DB_KEY.bili_dynamic_info_key }.${ card.id_str }`, JSON.stringify( card ), 60 );
				
				// 专栏类型
				if ( card.type === 'DYNAMIC_TYPE_ARTICLE' ) {
					this.articleHandle( card, qq_list ).then();
				} else if ( card.type === 'DYNAMIC_TYPE_LIVE_RCMD' ) {
					// do nothing
				} else if ( card.type === "DYNAMIC_TYPE_AV" ) {
					let text = card.modules.module_dynamic.desc?.text;
					text = text ? `\n${ text }` : "[投稿视频]";
					bot.logger.info( `[hot-news] 获取到B站[${ name }]-[${ pub_tss }]发布的新动态 [${ card.id_str }] ${ text }` );
					const { archive } = <BiliDynamicMajorArchive>card.modules.module_dynamic.major;
					const dynamicInfo: DynamicInfo = {
						id: card.id_str,
						name,
						uid,
						pub_time,
						pub_ts,
						pub_tss,
						like_num,
						comment_num,
						forward_num,
						archive
					};
					this.normalDynamicHandle( dynamicInfo, qq_list ).then();
				} else {
					let loggerMsg: string | undefined;
					if ( card.modules.module_dynamic.major?.type == 'MAJOR_TYPE_OPUS' ) {
						const opus = card.modules.module_dynamic.major?.opus;
						loggerMsg = opus?.title || opus?.summary.text;
					} else {
						loggerMsg = card.modules.module_dynamic.desc?.text;
					}
					bot.logger.info( `[hot-news] 获取到B站[${ name }]-[${ pub_tss }]发布的新动态 [${ card.id_str }] [${ loggerMsg }]` );
					const dynamicInfo: DynamicInfo = {
						id: card.id_str,
						name,
						uid,
						pub_time,
						pub_ts,
						pub_tss,
						like_num,
						comment_num,
						forward_num,
						jump_url: card.basic.jump_url
					};
					this.normalDynamicHandle( dynamicInfo, qq_list ).then();
				}
				await wait( 1500 );
			}
		}
	}
	
	private async isExpired( qq: string, pub_ts: number, name: string, card_id: string ) {
		const pub_tsm: number = pub_ts * 1000;
		const pub_tss: string = formatTimestamp( pub_tsm );
		const limit = await bot.redis.getString( `${ DB_KEY.limit_bili_dynamic_time_key }.${ qq }` );
		// 默认消息24小时即为过期
		let limitMillisecond = 86400000;
		if ( limit ) {
			limitMillisecond = parseInt( limit ) * 60 * 60 * 1000;
		}
		// 判断动态是否已经过时
		if ( Date.now() - pub_tsm > limitMillisecond ) {
			bot.logger.info( `[hot-news] [${ name }]-[${ pub_tss }]发布的动态[${ card_id }]已过时不再推送!` );
			return true;
		}
		return false;
	}
	
	private async normalDynamicHandle( dynamicInfo: DynamicInfo, qq_list: Set<string> ): Promise<void> {
		const {
			id, name, uid, pub_time, pub_ts, pub_tss, like_num,
			comment_num, forward_num, archive, jump_url
		} = dynamicInfo;
		let message: Sendable;
		const url = jump_url ? `https:${ jump_url }` : `https://t.bilibili.com/${ id }`;
		let img: Sendable = "";
		let ok: boolean = false;
		if ( config.screenshotType === 2 ) {
			const res: RenderResult = await renderer.asSegment(
				"/dynamic/index.html",
				{ dynamicId: id },
				this.viewPort
			);
			if ( res.code === "ok" ) {
				img = res.data;
				ok = true;
			} else {
				bot.logger.error( res.error );
			}
		} else {
			const res = await renderer.asForFunction( url, ScreenshotService.normalDynamicPageFunction, this.viewPort );
			if ( res.code === "ok" ) {
				img = res.data;
				ok = true;
			} else {
				bot.logger.error( res.error );
			}
		}
		if ( ok ) {
			if ( archive ) {
				archive.jump_url = "https:" + archive.jump_url;
				const params: Record<string, any> = {
					id,
					name,
					uid,
					pub_time,
					pub_tss,
					like_num,
					comment_num,
					forward_num,
					url,
					img,
					archive
				}
				message = MessageMethod.parseTemplate( config.videoDynamicTemplate, params );
			} else {
				const params: Record<string, any> = {
					id,
					name,
					uid,
					pub_time,
					pub_tss,
					like_num,
					comment_num,
					forward_num,
					url,
					img
				}
				message = MessageMethod.parseTemplate( config.dynamicTemplate, params );
			}
		} else {
			const params: Record<string, any> = {
				id,
				name,
				uid,
				pub_time,
				pub_tss,
				like_num,
				comment_num,
				forward_num,
				url
			}
			message = MessageMethod.parseTemplate( config.errorMsgTemplate, params );
		}
		for ( let qq of qq_list ) {
			const is_expired = await this.isExpired( qq, pub_ts, name, id );
			if ( is_expired ) continue;
			const type = await bot.redis.getHashField( DB_KEY.subscribe_chat_info_key, qq );
			if ( type !== "0" && type !== "1" ) {
				bot.logger.warn( `[hot-news] [${ qq }]的订阅类型(${ type })错误，无法发送动态消息` );
				continue;
			}
			await MessageMethod.sendMsg( parseInt( type ), parseInt( qq ), message );
		}
	}
	
	private async articleHandle( card: BiliDynamicCard, qq_list: Set<string> ): Promise<void> {
		let desc = "", title = "", jump_url = "", label = "";
		if ( card.modules.module_dynamic.major?.type === 'MAJOR_TYPE_ARTICLE' ) {
			const {
				desc: _desc,
				title: _title,
				jump_url: _jump_url,
				label: _label
			} = ( <BiliDynamicMajorArticle>card.modules.module_dynamic.major ).article;
			[ desc, title, jump_url, label ] = [ _desc, _title, _jump_url, _label ];
		} else if ( card.modules.module_dynamic.major?.type === 'MAJOR_TYPE_OPUS' ) {
			const {
				title: _title,
				jump_url: _jump_url,
				summary: { text }
			} = ( <BiliDynamicMajorOpus>card.modules.module_dynamic.major ).opus;
			[ desc, title, jump_url, label ] = [ text, _title, _jump_url, "" ];
		}
		const { name, mid: uid, pub_time, pub_ts } = card.modules.module_author;
		const id = card.id_str;
		const {
			comment: { count: comment_num },
			like: { count: like_num },
			forward: { count: forward_num }
		} = card.modules.module_stat;
		const pub_tsm: number = pub_ts * 1000;
		const pub_tss: string = formatTimestamp( pub_tsm );
		bot.logger.info( `[hot-news] 获取到B站-[${ pub_tss }]发布的${ name }新动态 [${ id }] \n${ desc }` );
		const url = `https:${ jump_url }`;
		const params: Record<string, any> = {
			id,
			name,
			uid,
			pub_time,
			pub_tss,
			like_num,
			comment_num,
			forward_num,
			title,
			label,
			url,
			desc
		}
		
		
		let imgMsg: Sendable;
		if ( config.screenshotType === 2 ) {
			const res: RenderResult = await renderer.asSegment(
				"/dynamic/index.html",
				{ dynamicId: card.id_str },
				this.viewPort
			);
			if ( res.code === "ok" ) {
				imgMsg = res.data;
			} else {
				bot.logger.error( res.error );
				imgMsg = MessageMethod.parseTemplate( config.errorMsgTemplate, params );
			}
		} else {
			// 直接截B站的图
			const res = await renderer.asForFunction( url, ScreenshotService.articleDynamicPageFunction, this.viewPort );
			if ( res.code === 'ok' ) {
				imgMsg = res.data;
			} else {
				bot.logger.error( res.error );
				imgMsg = MessageMethod.parseTemplate( config.errorMsgTemplate, params );
			}
		}
		
		const msg: Sendable = MessageMethod.parseTemplate( config.articleDynamicTemplate, params );
		for ( let qq of qq_list ) {
			const is_expired = await this.isExpired( qq, pub_ts, name, id );
			if ( is_expired ) continue;
			const type = await bot.redis.getHashField( DB_KEY.subscribe_chat_info_key, qq );
			if ( type !== "0" && type !== "1" ) {
				bot.logger.warn( `[hot-news] [${ qq }]的订阅类型(${ type })错误，无法发送动态消息` );
				continue;
			}
			await MessageMethod.sendMsg( parseInt( type ), parseInt( qq ), msg );
			await MessageMethod.sendMsg( parseInt( type ), parseInt( qq ), imgMsg );
		}
	}
}