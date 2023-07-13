<script lang="ts" setup>
import { onMounted, Ref, ref } from "vue";
import QRcode from "qrcode";

const props = withDefaults( defineProps<{
	url: string;
}>(), {
	url: "https://m.bilibili.com/dynamic/"
} );

const qrcode: Ref<HTMLCanvasElement | null> = ref( null );
onMounted( () => {
	QRcode.toCanvas( qrcode.value, props.url, {
		color: {
			light: '#ffffff',
			dark: '#000000'
		},
		width: 60,
		errorCorrectionLevel: "H"
	}, error => {
		console.error( "二维码生成失败: ", error );
	} )
} )
</script>

<template>
	<div class="qrcode_main" style="background: var(--Ga1)">
		<div class="left">
			<slot/>
		</div>
		<div class="right">
			<div class="qrcode-right-text">
				<span>保存图片</span>
				<span>打开哔哩哔哩APP</span>
				<span>扫码观看视频</span>
			</div>
			<canvas ref="qrcode" style="padding: 5px;border-radius: 5px;border: 1px solid var(--Ga4);"></canvas>
		</div>
	</div>
</template>

<style lang="scss" scoped>

</style>