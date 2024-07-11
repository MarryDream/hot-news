import { defineDirective } from "@/modules/command";
import { DB_KEY } from "#/hot-news/util/constants";
import bot from "ROOT";

export default defineDirective( "order", async ( { sendMessage, messageData, redis } ) => {
	const { user_id } = messageData;
	const exist = await redis.existHashKey( DB_KEY.sms_key, user_id.toString( 10 ) );
	if ( exist ) {
		await bot.redis.delHash( DB_KEY.sms_key, `${ user_id }` );
		await bot.redis.delHash( DB_KEY.sms_secret, `${ user_id }` );
		await sendMessage( "已取消您的短信订阅。" );
		return;
	}
	await sendMessage( "您尚未订阅短信服务。" );
} );