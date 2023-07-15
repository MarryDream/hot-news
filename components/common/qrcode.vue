<script lang="ts" setup>
import { toHumanize } from "#/hot-news/util/front-utils";
import { onMounted, Ref, ref } from "vue";
import QRCode from "qrcode";

const props = withDefaults( defineProps<{
	url: string;
}>(), {
	url: "https://m.bilibili.com/dynamic/"
} );

const qrcode: Ref<HTMLCanvasElement | null> = ref( null );
const date = new Date();
const create_time: Ref<string> = ref( toHumanize( date.getTime() / 1000 | 0, 2 ) );

onMounted( () => {
	QRCode.toCanvas( qrcode.value, props.url, {
		color: {
			light: '#ffffff',
			dark: '#000000'
		},
		width: 100,
		errorCorrectionLevel: "H"
	}, error => {
		if ( error ) console.error( "二维码生成失败: ", error );
	} )
} )
</script>

<template>
	<div class="qrcode_main">
		<div class="left">
			<img alt="logo" src="../../assets/img/bili_column_icon_bilibili.png"/>
			<div>
				<p style="color: #40171C">识别图中二维码，查看全文</p>
				<p style="color: #40171C">图片生成于：{{ create_time }}</p>
			</div>
		</div>
		<div class="right">
			<canvas ref="qrcode" style="padding: 5px"></canvas>
		</div>
	</div>
</template>

<style lang="scss" scoped>

</style>