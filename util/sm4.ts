import { SM4 } from "gm-crypto";

/**
 * SM4加密算法
 * @param data @type {string} 数据
 * @param secret @type {string} 密钥
 * @returns {string} 加密结果
 */
function sm4_encrypt( data: string, secret: string ) {
	const bytes_iv = Uint8Array.from( [ 3, 5, 6, 9, 6, 9, 5, 9, 3, 5, 6, 9, 6, 9, 5, 9 ] );
	const iv = Buffer.from( bytes_iv ).toString( 'hex' );
	return SM4.encrypt( data, secret, {
		iv,
		mode: SM4.constants.CBC,
		inputEncoding: "utf8",
		outputEncoding: "hex"
	} );
}

/**
 * SM4解密算法
 * @param data @type {string} 数据
 * @param secret @type {string} 密钥
 * @returns {string} 解密结果
 */
function sm4_decrypt( data: string, secret: string ) {
	const bytes_iv = Uint8Array.from( [ 3, 5, 6, 9, 6, 9, 5, 9, 3, 5, 6, 9, 6, 9, 5, 9 ] );
	const iv = Buffer.from( bytes_iv ).toString( 'hex' );
	return SM4.decrypt( data, secret, {
		iv,
		mode: SM4.constants.CBC,
		inputEncoding: "hex",
		outputEncoding: "utf8"
	} );
}

export { sm4_encrypt, sm4_decrypt };