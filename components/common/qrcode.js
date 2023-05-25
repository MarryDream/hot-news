const template = `<div class="qrcode_main">
<div class="left">
	<img src="../../public/img/bili_column_icon_bilibili.png" alt="logo"/>
	<div>
		<p style="color: #40171C">识别图中二维码，查看全文</p>
		<p style="color: #40171C">图片生成于：{{create_time}}</p>
	</div>
</div>
<div class="right">
	<div ref="qrcode" style="padding: 5px"></div>
</div>
</div>`

import { toHumanize } from "../../public/js/utils.js";

const { defineComponent, ref, onMounted } = Vue;

export default defineComponent( {
	name: "QRCode",
	template,
	components: {},
	props: {
		url: {
			type: String,
			default: ""
		}
	},
	setup( props ) {
		const qrcode = ref( null );
		const date = new Date();
		const create_time = ref( toHumanize( date.getTime() / 1000 | 0, 2 ) );
		onMounted( () => {
			new QRCode( qrcode.value, {
				text: props.url,
				width: 100,
				height: 100,
				colorDark: '#000000',
				colorLight: '#ffffff',
				correctLevel: QRCode.CorrectLevel.H,
			} );
		} )
		return {
			qrcode,
			create_time
		}
	}
} );