import { defineDirective, InputParameter } from "@/modules/command";
import { getChatInfo } from "#/hot-news/util/tools";
import { MessageType } from "@/modules/message";
import { CHANNEL_NAME, DB_KEY } from "#/hot-news/util/constants";
import { getBiliLiveStatus } from "#/hot-news/util/api";
import { config } from "#/hot-news/init";
import { GroupMessageEvent } from "@/modules/lib";

export default defineDirective( "order", async ( { sendMessage, messageData, redis }: InputParameter ) => {
	const { type, targetId } = getChatInfo( messageData );
	if ( type === MessageType.Group ) {
		const groupMsg = <GroupMessageEvent>messageData;
		if ( groupMsg.sender.role === 'member' ) {
			await sendMessage( '您不是本群管理不能使用该指令', true );
			return;
		}
	}
	
	// 判断该用户是否有订阅
	let member: string = JSON.stringify( { targetId, type } )
	let [ existNews, existBili ] = await Promise.all( [ redis.existSetMember( DB_KEY.ids, member ), redis.existSetMember( DB_KEY.sub_bili_ids_key, member ) ] );
	if ( !existNews && !existBili ) {
		await sendMessage( `[${ targetId }]未订阅任何信息` );
		return;
	}
	
	// 获取新闻渠道
	let channel: string = await redis.getHashField( DB_KEY.channel, `${ targetId }` ) || "[]";
	channel = channel.startsWith( "[" ) ? channel : `["${ channel }"]`;
	let parse: string[] = JSON.parse( channel );
	const map = parse.map( value => {
		return CHANNEL_NAME[value];
	} );
	
	// 获取用户订阅的UP的uid
	let upNames: string[] = [];
	const uidListStr: string = await redis.getHashField( DB_KEY.notify_bili_ids_key, `${ targetId }` ) || "[]";
	const uidList: number[] = JSON.parse( uidListStr );
	for ( let uid of uidList ) {
		try {
			const info = await getBiliLiveStatus( uid, true );
			upNames.push( `\n\t- ${ uid }${ info?.name ? `(${ info.name })` : "" }` );
		} catch ( e ) {
			upNames.push( `\n\t- ${ uid }` );
		}
	}
	
	let msg: string = `[${ targetId }]的订阅信息:\n消息服务: ${ existNews ? `[${ map.join( "," ) }]` : "未订阅消息服务" }\nB站UP: ${ existBili ? `${ upNames.join( " " ) }\n您还可以订阅${ config.maxSubscribeNum - upNames.length }位UP主.` : "未订阅B站UP" }`;
	await sendMessage( msg );
} );