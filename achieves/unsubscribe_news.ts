import { defineDirective, InputParameter } from "@/modules/command";
import { DB_KEY } from "#/hot-news/util/constants";
import { getChannel, getChatInfo } from "#/hot-news/util/tools";
import { MessageType } from "@/modules/message";
import { GroupMessageEvent } from "@/modules/lib";
import { searchBiliUser } from "#/hot-news/util/api";
import { getUpName } from "#/hot-news/util/promise";

export default defineDirective( "order", async ( i: InputParameter ) => {
	const { sendMessage, messageData, redis } = i;
	const input = messageData.raw_message;
	const { type, targetId } = getChatInfo( messageData );
	if ( type === MessageType.Group ) {
		const groupMsg = <GroupMessageEvent>messageData;
		if ( groupMsg.sender.role === 'member' ) {
			await sendMessage( '您不是本群管理不能使用该指令', true );
			return;
		}
	}
	
	// 处理原神B站动态订阅
	let channel = getChannel( input );
	
	// 处理B站UP主订阅
	if ( channel.type === "name" ) {
		// 搜索名称对应的uid
		const user = await searchBiliUser( channel.name );
		if ( typeof user === "string" ) {
			await sendMessage( user );
			return;
		}
		await unsubscribeBili( targetId, user.mid, i );
		return;
	}
	if ( channel.type === "uid" ) {
		await unsubscribeBili( targetId, channel.uid, i );
		return;
	}
	
	// 处理新闻等订阅
	let value: string = await redis.getHashField( DB_KEY.channel, `${ targetId }` ) || "[]";
	value = value.startsWith( "[" ) ? value : `["${ value }"]`;
	let parse: string[] = JSON.parse( value );
	const _channel = channel.channel;
	if ( parse.length === 0 || !parse.includes( _channel ) ) {
		await sendMessage( `[${ targetId }]未订阅[${ _channel }]` );
		return;
	}
	
	const filter = parse.filter( v => v && v !== _channel );
	if ( filter.length === 0 ) {
		await redis.delHash( DB_KEY.channel, `${ targetId }` );
	} else {
		await redis.setHash( DB_KEY.channel, { [`${ targetId }`]: JSON.stringify( filter ) } );
	}
	
	let [ existNews, existBili ] = await Promise.all( [ redis.existHashKey( DB_KEY.channel, `${ targetId }` ), redis.existHashKey( DB_KEY.notify_bili_ids_key, `${ targetId }` ) ] );
	if ( !existNews && !existBili ) {
		await redis.delHash( DB_KEY.subscribe_chat_info_key, `${ targetId }` );
	}
	await sendMessage( `[${ targetId }]已取消订阅[${ input }]服务` );
} );

async function unsubscribeBili( targetId: number, uid: number, i: InputParameter ) {
	const { redis, sendMessage } = i;
	const uidListStr = await redis.getHashField( DB_KEY.notify_bili_ids_key, `${ targetId }` ) || "[]";
	const uidList: number[] = JSON.parse( uidListStr );
	if ( uidList.length === 0 ) {
		await sendMessage( `[${ targetId }]未订阅任何B站UP的动态和直播` );
	} else {
		const name = await getUpName( uid, i ) || `${ uid }`;
		if ( uidList.includes( uid ) ) {
			// 把已推送 QQ 从列表中移除，避免影响其他订阅
			await redis.delListElement( DB_KEY.bili_live_notified_list_key + uid, `${ targetId }` );
			if ( uidList.length === 1 ) {
				await redis.delHash( DB_KEY.notify_bili_ids_key, `${ targetId }` );
			} else {
				const filter = uidList.filter( i => i !== uid );
				await redis.setHash( DB_KEY.notify_bili_ids_key, { [`${ targetId }`]: JSON.stringify( filter ) } );
			}
			
			let [ existNews, existBili ] = await Promise.all( [ redis.existHashKey( DB_KEY.channel, `${ targetId }` ), redis.existHashKey( DB_KEY.notify_bili_ids_key, `${ targetId }` ) ] );
			if ( !existNews && !existBili ) {
				await redis.delHash( DB_KEY.subscribe_chat_info_key, `${ targetId }` );
			}
			
			await sendMessage( `[${ targetId }]已成功取消B站[${ name }]的订阅。` );
			return;
		}
		
		await sendMessage( `[${ targetId }]未订阅过B站[${ name }]的动态和直播。` );
	}
}