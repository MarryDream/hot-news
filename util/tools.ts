import { isGroupMessage, isPrivateMessage, Message, MessageType } from "@/modules/message";
import { ChatInfo } from "#/hot-news/types/type";
import { CHANNEL_NAME } from "#/hot-news/util/constants";
import { exec } from "child_process";
import FileManagement from "@/modules/file";
import { BOT } from "@/modules/bot";
import bot from "ROOT";
import { randomBytes } from "crypto";

export const formatDate: ( date: Date, format?: string ) => string = ( date, format = "-" ) => {
	const dateArr: number[] = [ date.getFullYear(), date.getMonth() + 1, date.getDate() ];
	return dateArr.join( format );
}

export const formatTimestamp: ( timestamp: number ) => string = ( timestamp ) => {
	const date = new Date( timestamp );
	const dateArr: number[] = [ date.getFullYear(), date.getMonth() + 1, date.getDate() ];
	return dateArr.join( '-' ) + " " + date.toLocaleTimeString( "zh-CN", { hour12: false } );
}

export const getChatInfo: ( messageData: Message ) => ChatInfo = ( messageData ) => {
	// 获取当前对话的群号或者QQ号
	if ( isGroupMessage( messageData ) ) {
		return {
			targetId: messageData.group_id,
			user_id: messageData.user_id,
			type: MessageType.Group
		};
	} else if ( isPrivateMessage( messageData ) && messageData.sub_type === 'friend' ) {
		return {
			targetId: messageData.user_id,
			user_id: messageData.user_id,
			type: MessageType.Private
		};
	} else {
		return {
			targetId: -1,
			user_id: messageData.user_id,
			type: MessageType.Unknown
		};
	}
}

type UidChannel = { type: "uid", uid: number };
type NewsChannel = { type: "news", channel: string };
type NameChannel = { type: "name", name: string };
export type Channel = UidChannel | NewsChannel | NameChannel;

export const getChannel = ( input: string ): Channel => {
	const reg = new RegExp( /(?<news>新浪|知乎|网易|头条|百度|60秒新闻|摸鱼)|(?<uid>\d+)|(?<name>.*)/ );
	const { news, uid, name } = reg.exec( input )?.groups!;
	
	if ( uid ) return { type: "uid", uid: parseInt( uid ) };
	
	for ( let k in CHANNEL_NAME ) {
		if ( CHANNEL_NAME[k] === news ) {
			return {
				type: "news",
				channel: k
			};
		}
	}
	
	return { type: "name", name };
}

/**
 * await实现线程暂定的功能，等同于 sleep
 * @param ms
 */
export async function wait( ms: number ): Promise<void> {
	return new Promise( resolve => setTimeout( resolve, ms ) );
}

export function msToHumanize( ms: number ): string {
	ms = ms / 1000 | 0;
	const hour = Math.floor( ms / 3600 );
	const minute = Math.floor( ( ms - hour * 3600 ) / 60 );
	const second = ms % 60;
	return `${ hour }:${ minute }:${ second }`;
}

/* 命令执行 */
async function execHandle( command: string ): Promise<string> {
	return new Promise( ( resolve, reject ) => {
		exec( command, ( error, stdout, stderr ) => {
			if ( error ) {
				reject( error );
			} else {
				resolve( stdout );
			}
		} )
	} )
}

function checkDependencies( file: FileManagement, ...dependencies: string[] ): string[] {
	const path: string = file.getFilePath( "package.json", "root" );
	const { dependencies: dep } = require( path );
	// 过滤出未安装的依赖
	const keys: string[] = Object.keys( dep );
	return dependencies.filter( dependency => !keys.includes( dependency ) );
}

export async function installDep( { logger, file }: BOT ): Promise<void> {
	logger.info( "[hot-news] 开始检测插件需要的依赖是否已安装..." );
	const dependencies: string[] = [ "qrcode" ];
	const uninstall_dependencies: string[] = checkDependencies( file, ...dependencies );
	for ( let uni_dep of uninstall_dependencies ) {
		logger.info( `[hot-news] 检测到 ${ uni_dep } 依赖尚未安装，将自动安装该依赖...` )
		const stdout = await execHandle( `pnpm add ${ uni_dep }` );
		logger.info( stdout );
	}
	logger.info( "[hot-news] 所有插件需要的依赖已安装" );
}


export function getVersion(): string {
	const path: string = bot.file.getFilePath( "package.json", "root" );
	const { version } = require( path );
	return version.split( "-" )[0];
}

/**
 * 比较两个版本号
 * @param v1
 * @param v2
 * @return 0,1,-1
 */
export function version_compare( v1: string, v2: string ): number {
	//将两个版本号拆成数组
	const arr1 = v1.split( '.' ),
		arr2 = v2.split( '.' );
	const minLength = Math.min( arr1.length, arr2.length );
	//依次比较版本号每一位大小
	for ( let i = 0; i < minLength; i++ ) {
		if ( parseInt( arr1[i] ) != parseInt( arr2[i] ) ) {
			return ( parseInt( arr1[i] ) > parseInt( arr2[i] ) ) ? 1 : -1;
		}
	}
	// 若前几位分隔相同，则按分隔数比较。
	if ( arr1.length == arr2.length ) {
		return 0;
	} else {
		return ( arr1.length > arr2.length ) ? 1 : -1;
	}
}

export function get_uuid(): string {
	let e = get_part_str( 8 )
		, t = get_part_str( 4 )
		, r = get_part_str( 4 )
		, n = get_part_str( 4 )
		, o = get_part_str( 12 )
		, i = ( new Date ).getTime();
	return e + "-" + t + "-" + r + "-" + n + "-" + o + add_zero_char( ( i % 1e5 ).toString(), 5 ) + "infoc"
}

function get_part_str( e: number ): string {
	let t = ""
	for ( let r = 0; r < e; r++ )
		t += dec_to_hex( 16 * Math.random() );
	return add_zero_char( t, e )
}

function add_zero_char( e: string, t: number ): string {
	let r = "";
	if ( e.length < t )
		for ( let n = 0; n < t - e.length; n++ )
			r += "0";
	return r + e
}


function dec_to_hex( e: number ): string {
	return Math.ceil( e ).toString( 16 ).toUpperCase();
}

export function random_png_end() {
	const rand_png = Uint8Array.from( [
		...randomBytes( 32 ),
		0x00, 0x00, 0x00, 0x00,
		73, 69, 78, 68,
		...randomBytes( 4 )
	] )
	return Buffer.from( rand_png ).toString( 'base64' ).slice( -50 );
}

export function random_canvas() {
	const rand_png = Uint8Array.from( [
		...randomBytes( 2 ),
		0x00, 0x00, 0x00, 0x00,
		73, 69, 78, 68,
		0x00, 0xE0A0, 0x00, 0x2000
	] )
	return Buffer.from( rand_png ).toString( 'base64' );
}

export function random_audio() {
	const min: number = 124.04347;
	const max: number = 124.04348;
	return Math.random() * ( max - min ) + min;
}

export function randomId( length: number, seed?: string ): string {
	// 如果characterSet是未定义的或者不是字符串，则使用默认字符集
	if ( typeof seed !== 'string' ) {
		seed = '[*]';
	}
	
	// 根据characterSet的值设置不同的字符集
	let charPool = '';
	if ( seed === '[*]' ) {
		// 包含数字、小写字母、大写字母和特殊字符
		charPool = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ~`!@#$%^&*()-_+=[]{};:"\',<.>/?';
	} else {
		// 根据characterSet包含的字符来构建字符集
		if ( /0-9/.test( seed ) ) charPool += '0123456789';
		if ( /a-z/.test( seed ) ) charPool += 'abcdefghijklmnopqrstuvwxyz';
		if ( /A-Z/.test( seed ) ) charPool += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
		if ( /\[s\]/.test( seed ) ) charPool += '~`!@#$%^&*()-_+=[]{};:"\',<.>/?';
	}
	
	// 确保字符集不为空
	if ( charPool === '' ) {
		throw new Error( 'Invalid character set specified.' );
	}
	
	// 生成随机ID
	let id = '';
	for ( let i = 0; i < length; i++ ) {
		// 从字符集中随机选择一个字符
		const randomIndex = Math.floor( Math.random() * charPool.length );
		id += charPool[randomIndex];
	}
	
	// 返回生成的随机ID
	return id;
}

export function transferText( str: string, mode: 'u2a' | 'a2u' ) {
	if ( mode === 'a2u' ) {
		return str.replace( /&#(\d+);/g, ( _, $1 ) => String.fromCharCode( Number( $1 ) ) )
	} else {
		return str.replace( /./, ( _ ) => `&#${ _.charCodeAt( 0 ) };` )
	}
}