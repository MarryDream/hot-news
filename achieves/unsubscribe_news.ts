import { defineDirective, InputParameter } from "@/modules/command";
import { CHANNEL_NAME, DB_KEY } from "#/hot-news/util/constants";
import { getChannelKey, getChatInfo } from "#/hot-news/util/tools";
import { MessageType } from "@/modules/message";
import { GroupMessageEvent } from "@/modules/lib";

export default defineDirective( "order", async ( i: InputParameter ) => {
	const { sendMessage, messageData, redis } = i;
	const channel = messageData.raw_message;
	const { type, targetId } = getChatInfo( messageData );
	if ( type === MessageType.Group ) {
		const groupMsg = <GroupMessageEvent>messageData;
		if ( groupMsg.sender.role === 'member' ) {
			await sendMessage( '您不是本群管理不能使用该指令', true );
			return;
		}
	}
	
	// 处理原神B站动态订阅
	let channelKey = getChannelKey( channel );
	if ( !channelKey ) {
		await sendMessage( `[${ channel }]不是可用的信息源。` );
		return;
	}
	if ( channel === CHANNEL_NAME.genshin || ( channelKey === 401742377 ) ) {
		await unsubscribeBili( targetId, 401742377, i );
		return;
	}
	
	// 处理B站UP主订阅
	if ( typeof channelKey === "number" ) {
		await unsubscribeBili( targetId, channelKey, i );
		return;
	}
	
	// 处理新闻等订阅
	let value: string = await redis.getHashField( DB_KEY.channel, `${ targetId }` ) || "[]";
	value = value.startsWith( "[" ) ? value : `["${ value }"]`;
	let parse: string[] = JSON.parse( value );
	if ( parse.length === 0 ) {
		await sendMessage( `[${ targetId }]未订阅[${ channel }]` );
		return;
	}
	if ( !parse.includes( channelKey ) ) {
		await sendMessage( `[${ targetId }]未订阅[${ channel }]` );
		return;
	}
	const filter = parse.filter( v => v && v !== channelKey && v !== CHANNEL_NAME.genshin );
	if ( filter.length === 0 ) {
		await redis.delHash( DB_KEY.channel, `${ targetId }` );
	} else {
		await redis.setHash( DB_KEY.channel, { [`${ targetId }`]: JSON.stringify( filter ) } );
	}
	
	let [ existNews, existBili ] = await Promise.all( [ redis.existHashKey( DB_KEY.channel, `${ targetId }` ), redis.existHashKey( DB_KEY.notify_bili_ids_key, `${ targetId }` ) ] );
	if ( !existNews && !existBili ) {
		await redis.delHash( DB_KEY.subscribe_chat_info_key, `${ targetId }` );
	}
	await sendMessage( `[${ targetId }]已取消订阅[${ channel }]服务` );
} );

async function unsubscribeBili( targetId: number, uid: number, {
	redis,
	sendMessage
}: InputParameter ) {
	const uidListStr = await redis.getHashField( DB_KEY.notify_bili_ids_key, `${ targetId }` ) || "[]";
	const uidList: number[] = JSON.parse( uidListStr );
	if ( uidList.length === 0 ) {
		await sendMessage( `[${ targetId }]未订阅任何B站UP的动态和直播` );
	} else {
		const name = uid === 401742377 ? "原神" : `${ uid }`;
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
			
			await sendMessage( `[${ targetId }]已成功取消订阅过B站[${ name }]的动态和直播。` );
			return;
		}
		
		await sendMessage( `[${ targetId }]未订阅过B站[${ name }]的动态和直播。` );
	}
}