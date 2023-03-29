import { Logger } from "log4js";
import express from "express";
import Dynamic from "#hot-news/routes/dynamic";
import Live from "#hot-news/routes/live";

export function createServer( port: number, logger: Logger ): void {
	const app = express();
	app.use( express.static( __dirname ) );
	
	app.use( "/api/dynamic", Dynamic );
	app.use( "/api/live", Live );
	
	app.listen( port, () => {
		logger.info( `[hot-news]插件的 Express 服务器已启动, 端口为: ${ port }` );
	} );
}