import { isGroupMessage, isPrivateMessage, Message, MessageType } from "@/modules/message";
import { ChatInfo } from "#/hot-news/types/type";
import { CHANNEL_NAME } from "#/hot-news/util/constants";
import { exec } from "child_process";
import FileManagement from "@/modules/file";
import { BOT } from "@/modules/bot";
import { config } from "#/hot-news/init";
import bot from "ROOT";

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

export const getChannelKey: ( channel: string ) => ( string | number | null ) = ( channel ) => {
	const reg = new RegExp( /^[0-9]+$/ );
	const isNumber = reg.test( channel );
	if ( isNumber ) {
		return parseInt( reg.exec( channel )![0] );
	}
	
	for ( let k in CHANNEL_NAME ) {
		if ( CHANNEL_NAME[k] === channel ) {
			return k;
		}
	}
	
	return null;
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

function checkDependencies( file: FileManagement, ...dependencies ): string[] {
	const path: string = file.getFilePath( "package.json", "root" );
	const { dependencies: dep } = require( path );
	// 过滤出未安装的依赖
	const keys: string[] = Object.keys( dep );
	return dependencies.filter( dependency => !keys.includes( dependency ) );
}

export async function installDep( { logger, file }: BOT ): Promise<void> {
	logger.info( "[hot-news] 开始检测插件需要的依赖是否已安装..." );
	const dependencies: string[] = [];
	if ( config.subscribeMoyu.enable && config.subscribeMoyu.apiType === 2 ) {
		dependencies.push( "sharp" );
	}
	const uninstall_dependencies: string[] = checkDependencies( file, ...dependencies );
	for ( let uni_dep of uninstall_dependencies ) {
		logger.info( `[hot-news] 检测到 ${ uni_dep } 依赖尚未安装，将自动安装该依赖...` )
		const stdout = await execHandle( `npm i ${ uni_dep }` );
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
export function version_compare( v1, v2 ): number {
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

export function toHumanize( unixTimestamp: number, type: number = 1 ): string {
	const date: Date = new Date( unixTimestamp * 1000 );
	const hour: number = date.getHours();
	const minute: number = date.getMinutes();
	const m: string = minute < 10 ? `0${ minute }` : `${ minute }`;
	const h: string = hour < 10 ? `0${ hour }` : `${ hour }`;
	
	return type === 1
		? `${ date.getFullYear() }年${ date.getMonth() + 1 }月${ date.getDate() }日 ${ h }:${ m }`
		: `${ date.getFullYear() }-${ date.getMonth() + 1 }-${ date.getDate() } ${ h }:${ m }`;
}

/**
 * 扒的处理过的js，故不好阅读，也不需要在意
 * @param width
 * @param height
 * @returns {{width, height}|{width: number, height: number}|{width: number, height: number}|{width: number, height: number}|*}
 */
export function getStyle( width: number, height: number ): { width: number, height: number } {
	let e = width
		, n = height;
	if ( e <= 120 || n <= 120 )
		return {
			width: 120,
			height: 120
		};
	if ( e <= 360 && n <= 280 )
		return {
			width: e,
			height: n
		};
	let r = e / n
		, i = n / e;
	if ( r <= 2 && i <= 2 && ( e > 360 || n > 280 ) ) {
		let a = e / 360
			, o = n / 280;
		return a > o ? {
			width: 360,
			height: n / a
		} : {
			width: e / o,
			height: 280
		}
	}
	if ( i > 3 )
		return {
			width: 140,
			height: 280
		};
	if ( ( r > 2 || i > 2 ) && ( e > 360 || n > 280 ) )
		return e / 360 > n / 280 ? {
			width: 360,
			height: 180
		} : {
			width: 140,
			height: 280
		};
	let s = {
		width: 320,
		height: 240
	};
	return e < 360 ? r >= 1 ? ( s.width = 180,
		s.height = s.width / r,
		s ) : r < .75 ? ( s.height = 240,
		s.width = s.height * r,
		s ) : ( s.width = 240,
		s.height = s.width / r,
		s ) : e > 960 ? r >= 1 ? ( s.width = 320,
		s.height = s.width / r,
		s ) : r < .75 ? ( s.width = 240,
		s.height = 320,
		s ) : ( s.width = 240,
		s.height = s.width / r,
		s ) : r >= 1 ? ( s.width = 240,
		s.height = s.width / r,
		s ) : r < .75 ? ( s.width = 240,
		s.height = 320,
		s ) : ( s.width = 240,
		s.height = s.width / r,
		s )
}


/**
 *int转RGB
 */
export function intToColor( argb: number ): string {
	let r: number, g: number, b: number;
	r = ( argb & 0xff0000 ) >> 16;
	g = ( argb & 0xff00 ) >> 8;
	b = ( argb & 0xff );
	return `rgb(${ r },${ g },${ b })`;
}