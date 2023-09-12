import { defineDirective, InputParameter } from "@/modules/command";
import { GroupMessageEvent } from "@/modules/lib";
import { DB_KEY } from "#/hot-news/util/constants";
import { getLiveUserInfo } from "#/hot-news/util/api";
import { LiveUserInfo } from "#/hot-news/types/type";

export default defineDirective( "order", async ( { sendMessage, messageData, redis, client }: InputParameter ) => {
	const { sender: { role }, group_id } = <GroupMessageEvent>messageData;
	const uid: string = messageData.raw_message;
	if ( role === 'member' ) {
		await sendMessage( '您不是本群管理不能使用该指令' );
		return;
	}
	
	const member = await client.getGroupMemberInfo( group_id, client.uin );
	if ( member.status !== 'ok' ) {
		await sendMessage( 'BOT 的群权限查询失败' );
		return;
	}
	if ( member.data.role === 'member' ) {
		await sendMessage( 'BOT 无群管理权限无法使用@全体功能' );
		return;
	}
	
	const liveInfo: LiveUserInfo | undefined = await getLiveUserInfo( parseInt( uid ) );
	let name: string = uid;
	if ( liveInfo ) {
		name = liveInfo.uname;
	}
	
	const key = `${ DB_KEY.notify_at_all_up_key }${ group_id }`;
	let list: string[] = await redis.getList( key );
	if ( !list.includes( uid ) ) {
		await sendMessage( `UP: ${ name }未设置在允许@全体的列表。` );
		return;
	}
	
	await redis.delListElement( key, uid );
	list = list.filter( value => value !== uid ).map( value => `- ${ value }` );
	if ( list.length > 0 ) {
		await sendMessage( `已将UP: ${ name }从允许@全体的列表移除，列表还有以下UP：\n${ list.join( "\n" ) }` );
		return;
	}
	await sendMessage( `已将UP: ${ name }从允许@全体的列表移除` );
} )
