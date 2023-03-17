import { isGroupMessage, isPrivateMessage, Message, MessageType } from "@modules/message";
import { ChatInfo } from "#hot-news/types/type";
import { CHANNEL_NAME } from "#hot-news/util/constants";
import { exec } from "child_process";
import FileManagement from "@modules/file";
import { BOT } from "@modules/bot";
import { config } from "#hot-news/init";

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