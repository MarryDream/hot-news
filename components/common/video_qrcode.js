const template = `<div class="qrcode_main" style="background: var(--Ga1)">
<div class="left">
	<slot/>
</div>
<div class="right">
	<div class="qrcode-right-text">
		<span>保存图片</span>
		<span>打开哔哩哔哩APP</span>
		<span>扫码观看视频</span>
	</div>
	<div ref="qrcode" style="padding: 5px;border-radius: 5px;border: 1px solid var(--Ga4);"></div>
</div>
</div>`

const { defineComponent, ref, onMounted } = Vue;

export default defineComponent( {
	name: "VideoQRCode",
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
		onMounted( () => {
			new QRCode( qrcode.value, {
				text: props.url,
				width: 60,
				height: 60,
				colorDark: '#000000',
				colorLight: '#ffffff',
				correctLevel: QRCode.CorrectLevel.H,
			} );
		} )
		return {
			qrcode
		}
	}
} );