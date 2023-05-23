import puppeteer from "puppeteer";
import bot from "ROOT";

export class ScreenshotService {
	
	/**
	 * B站常规动态截图处理
	 * @param page
	 */
	public static async normalDynamicPageFunction( page: puppeteer.Page ): Promise<Buffer | string | void> {
		// 把头部信息以及可能出现的未登录弹框删掉
		const content = await page.content();
		// 判断网页内容是否被重定向至新版动态，如果是则按新版动态处理
		const url = page.url();
		if ( content.includes( "opus-detail" ) ) {
			bot.logger.info( `${ url }, 按新版B站动态[opus]处理截图` )
			await page.$eval( "#bili-header-container", element => element.remove() );
			const detail = await page.waitForSelector( ".bili-opus-view" );
			return detail?.screenshot( { encoding: "base64" } );
		}
		await page.$eval( "#internationalHeader", element => element.remove() );
		// 把未登录的弹框节点删掉
		await page.$eval( ".unlogin-popover", element => element.remove() );
		let card = await page.waitForSelector( ".card" );
		let clip = await card?.boundingBox();
		let bar = await page.waitForSelector( ".bili-dyn-item__footer" )
		let bar_bound = await bar?.boundingBox();
		clip!.height = bar_bound!.y - clip!.y;
		return await page.screenshot( {
			clip: { x: clip!.x, y: clip!.y, width: clip!.width, height: clip!.height },
			encoding: "base64"
		} );
	}
	
	/**
	 * B站动态专栏动态截图
	 * @param page
	 */
	public static async articleDynamicPageFunction( page: puppeteer.Page ): Promise<Buffer | string | void> {
		await page.$eval( "#internationalHeader", element => element.remove() );
		const option: puppeteer.ScreenshotOptions = { encoding: "base64" };
		const element = await page.$( ".article-container__content" );
		if ( element ) {
			return await element.screenshot( option );
		}
		throw '渲染图片出错，未找到DOM节点';
	}
}