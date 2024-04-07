import bot from "ROOT";
import { segment, Sendable } from "@/modules/lib";
import { MessageType } from "@/modules/message";
import { config } from "#/hot-news/init";
import { wait } from "#/hot-news/util/tools";

export class MessageMethod {
	static count: number = 1;
	
	static async sendMsg( type: number, targetId: number, msg: Sendable, userID: number | "all" | string = -1 ) {
		// 统一发消息限速
		if ( config.pushLimit.enable && this.count > config.pushLimit.limitTimes ) {
			await wait( config.pushLimit.limitTime * 1000 );
			this.count = 0;
		}
		
		try {
			if ( type === MessageType.Private ) {
				const sendMessage = bot.message.getSendMessageFunc( targetId, MessageType.Private );
				await sendMessage( msg );
			} else {
				const sendMessage = bot.message.getSendMessageFunc( userID, MessageType.Group, targetId );
				await sendMessage( msg );
			}
			this.count++;
		} catch ( err ) {
			bot.logger.error( `[${ targetId }]的订阅消息发送时报错: `, err );
		}
	}
	
	static parseTemplate( template: string, params: Record<string, any> ): Sendable {
		let text_message: string = template;
		Object.keys( params ).forEach( key => {
			const regExp = new RegExp( "\\${\\s*" + key + "\\s*}" );
			if ( key === "img" ) {
				text_message = text_message.replace( regExp, "#1" );
				return;
			}
			if ( key === "archive" ) {
				Object.keys( params[key] ).forEach( archive_key => {
					const reg = new RegExp( "\\${\\s*archive\\." + archive_key + "\\s*}" );
					if ( archive_key === "cover" ) {
						text_message = text_message.replace( reg, "#2" );
						return;
					}
					text_message = text_message.replace( reg, params[key][archive_key] );
				} )
			}
			text_message = text_message.replace( regExp, params[key] );
		} );
		
		const img_index = template.search( /\${\s*img\s*}/ );
		const img_last_index = template.search( /\${\s*img\s*}$/ );
		const cover_index = template.search( /\${\s*archive\.cover\s*}/ );
		const cover_last_index = template.search( /\${\s*archive\.cover\s*}$/ );
		
		// 截图变量位于最后
		if ( img_last_index !== -1 ) {
			text_message = text_message.replace( "#1", "" );
			// 同时使用了视频封面图
			if ( cover_index !== -1 ) {
				const split: string[] = text_message.split( "#2" );
				// 把cover转为 ImageElem 对象
				const cover = segment.image( params["archive"]["cover"] );
				return [ split[0], cover, split[1], params["img"] ];
			}
			return [ text_message, params["img"] ];
		}
		
		// 视频封面变量位于最后
		if ( cover_last_index !== -1 ) {
			text_message = text_message.replace( "#2", "" );
			// 把cover转为 ImageElem 对象
			const cover = segment.image( params["archive"]["cover"] );
			// 同时使用了截图
			if ( img_index !== -1 ) {
				const split: string[] = text_message.split( "#1" );
				return [ split[0], params["img"], split[1], cover ];
			}
			return [ text_message, cover ];
		}
		
		// 截图变量处于中间位置
		if ( img_index !== -1 ) {
			const split: string[] = text_message.split( "#1" );
			// 同时使用了视频封面图
			if ( cover_index !== -1 ) {
				if ( cover_index < img_index ) {
					// xxxx 封面 xxxx 截图 xxxx
					const split2: string[] = split[0].split( "#2" );
					return [ split2[0], params["archive"]["cover"], split2[1], params["img"], split[1] ];
				} else {
					// xxxx 截图 xxxx 封面 xxxx
					const split2: string[] = split[1].split( "#2" );
					// 把cover转为 ImageElem 对象
					const cover = segment.image( params["archive"]["cover"] );
					return [ split[0], params["img"], split2[0], cover, split2[1] ];
				}
			}
			
			return [ split[0], params["img"], split[1] ];
		}
		
		// 视频封面变量处于中间位置
		if ( cover_index !== -1 ) {
			const split: string[] = text_message.split( "#2" );
			// 把cover转为 ImageElem 对象
			const cover = segment.image( params["archive"]["cover"] );
			// 同时使用了截图
			if ( img_index !== -1 ) {
				if ( img_index < cover_index ) {
					// xxxx 截图 xxxx 封面 xxxx
					const split2: string[] = split[0].split( "#1" );
					return [ split2[0], params["img"], split2[1], cover, split[1] ];
				} else {
					// xxxx 封面 xxxx 截图 xxxx
					const split2: string[] = split[1].split( "#1" );
					return [ split[0], cover, split2[0], params["img"], split2[1] ];
				}
			}
			
			return [ split[0], cover, split[1] ];
		}
		return text_message;
	}
}