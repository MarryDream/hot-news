/**
 * @typedef {RequestInit} ServerConfig
 * @property {string} [baseURL]
 */

/**
 *
 * @param {string} url
 * @return {JSON} {any}
 */
export default function request( url ) {
	url = "/hot-news/api" + url;
	const Http = new XMLHttpRequest();
	Http.open( "GET", url, false );
	Http.send();
	return JSON.parse( Http.responseText );
}