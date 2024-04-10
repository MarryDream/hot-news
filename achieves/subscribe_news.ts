import { defineDirective, InputParameter } from "@/modules/command";
import { MessageType } from "@/modules/message";
import { searchBiliUser } from "#/hot-news/util/api";
import { getChannel, getChatInfo } from "#/hot-news/util/tools";
import { CHANNEL_NAME, DB_KEY } from "#/hot-news/util/constants";
import { config, scheduleNews } from "#/hot-news/init";
import { GroupMessageEvent } from "@/modules/lib";
import { NewsServiceFactory } from "#/hot-news/module/NewsServiceFactory";
import { getUpName } from "#/hot-news/util/promise";

export default defineDirective( "order", async ( i: InputParameter ) => {
	const { sendMessage, messageData, redis } = i;
	const input = messageData.raw_message || CHANNEL_NAME.toutiao;
	const { type, targetId } = getChatInfo( messageData );
	if ( type === MessageType.Unknown ) {
		await sendMessage( '不支持的聊天来源,请在需要订阅的群里或者好友对话中使用!' );
		return;
	}
	
	if ( input === CHANNEL_NAME.moyu && !config.subscribeMoyu.enable ) {
		await sendMessage( "BOT 持有者未启用摸鱼日报服务，该服务无法使用。" );
		return;
	}
	
	let channel = getChannel( input );
	
	if ( type === MessageType.Group ) {
		const groupMsg = <GroupMessageEvent>messageData;
		if ( groupMsg.sender.role === 'member' ) {
			await sendMessage( '您不是本群管理不能使用该指令', true );
			return;
		}
	}
	
	// 处理B站UP主订阅
	if ( channel.type === "name" ) {
		// 搜索名称对应的uid
		const user = await searchBiliUser( channel.name );
		if ( typeof user === "string" ) {
			await sendMessage( user );
			return;
		}
		await biliHandler( targetId, type, user.mid, user.uname, i );
		return;
	}
	if ( channel.type === "uid" ) {
		let upName = await getUpName( channel.uid, i );
		if ( upName === undefined ) {
			await sendMessage( "未找到该UP主信息，请检查UP主UID是否正确。" );
			return;
		}
		if ( upName === null ) {
			await sendMessage( `查询 UP主[${ channel.uid }]时网络请求错误, 请稍后再试!` );
			return;
		}
		
		// 初始化该UP的动态数据
		await biliHandler( targetId, type, channel.uid, upName, i );
		return;
	}
	
	// 处理新闻、摸鱼等订阅
	let value: string = await redis.getHashField( DB_KEY.channel, `${ targetId }` ) || "[]";
	value = value.startsWith( "[" ) ? value : `["${ value }"]`;
	let parse: string[] = JSON.parse( value );
	if ( !parse.includes( channel.channel ) ) {
		parse.push( channel.channel );
		await redis.setHash( DB_KEY.channel, { [`${ targetId }`]: JSON.stringify( parse ) } );
		await redis.setHashField( DB_KEY.subscribe_chat_info_key, `${ targetId }`, `${ type }` );
	}
	
	await sendMessage( `[${ targetId }]已成功订阅[${ input }]消息。` );
	
	const news = await NewsServiceFactory.instance( input ).getInfo( channel.channel );
	await sendMessage( news );
} );

async function biliHandler( targetId: number, type: number, uid: number, upName: string, {
	redis,
	sendMessage
}: InputParameter ): Promise<void> {
	// 获取用户订阅的UP的uid
	const uidListStr: string = await redis.getHashField( DB_KEY.notify_bili_ids_key, `${ targetId }` ) || "[]";
	const uidList: number[] = JSON.parse( uidListStr );
	if ( uidList.includes( uid ) ) {
		await sendMessage( `[${ targetId }]已订阅过B站[${ upName }]的动态和直播。` );
		return;
	}
	
	if ( uidList.length >= config.maxSubscribeNum ) {
		await sendMessage( `[${ targetId }]的可订阅UP主数量已达到 BOT 持有者设置的上限，无法再订阅UP主，可通过取消其他UP主的订阅减少你的订阅数量。` )
		return;
	}
	
	uidList.push( uid );
	await redis.setHash( DB_KEY.notify_bili_ids_key, { [`${ targetId }`]: JSON.stringify( uidList ) } );
	await redis.setHashField( DB_KEY.subscribe_chat_info_key, `${ targetId }`, `${ type }` );
	await scheduleNews.initBiliDynamic( uid );
	await sendMessage( `[${ targetId }]已成功订阅B站[${ upName }]的动态和直播。` );
	return;
}