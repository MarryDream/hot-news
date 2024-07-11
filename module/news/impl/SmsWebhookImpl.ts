import { NewsService } from "#/hot-news/module/news/NewsService";
import { Sendable } from "@/modules/lib";
import bot from "ROOT";
import { DB_KEY } from "#/hot-news/util/constants";
import { getRandomString } from "@/utils/random";
import { Md5 } from "md5-typescript";
import { config } from "#/hot-news/init";

export class SmsWebhookImpl implements NewsService {
	async getInfo( channel?: string ): Promise<Sendable> {
		if ( !channel ) throw new Error( "Channel is required." );
		
		let token = await bot.redis.getHashField( DB_KEY.sms_key, `${ channel }` );
		
		if ( !token ) {
			token = this.randomToken( channel );
			const secret = getRandomString( 32 );
			await bot.redis.setHashField( DB_KEY.sms_secret, channel, secret );
			await bot.redis.setHashField( DB_KEY.sms_key, channel, token );
		}
		
		return `${ config.apiDomain }/hot-news/api/webhook?token=${ token }`;
	}
	
	async handler(): Promise<void> {
		throw new Error( "Method not implemented." );
	}
	
	randomToken( salt: string ) {
		const str = getRandomString( 36 ) + salt;
		return Md5.init( str );
	}
	
}