import { defineDirective, InputParameter } from "@/modules/command";
import { GroupMessageEvent, Member } from "icqq";
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
	
	const member: Member = client.pickMember( group_id, client.uin );
	if ( !member.is_admin ) {
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
	if ( list.includes( uid ) ) {
		await sendMessage( `UP: ${ name }已设置在允许@全体的列表，不用重复设置。` );
		return;
	}
	
	await redis.addListElement( key, uid );
	list.push( uid );
	list = list.map( value => `- ${ value }` );
	await sendMessage( `已将UP: ${ name }设置在允许@全体的列表，目前列表有以下UP：\n${ list.join( "\n" ) }` );
} );