<script lang="ts" setup>

import { intToColor, toHumanize } from "#/hot-news/util/front-utils";
import VideoQRCode from "#/hot-news/components/common/video_qrcode.vue";
import { onMounted, reactive, ref } from "vue";
import { urlParamsGet } from "@/utils/url";
import $http from "#/hot-news/util/http"
import { BiliLiveInfo, LiveUserInfo } from "#/hot-news/types/type";

const date = new Date();
const share_time = toHumanize( date.getTime() / 1000 | 0, 2 );
const aprilFoolsDay = date.getMonth() + 1 === 4 && date.getDate() === 1;
const state = reactive( {
	name: "",
	liveRoom: {},
	follower_num: "",
	level: "",
	color: "",
	isOfficial: false,
	isPersonal: false,
	isBigVip: false,
	isSmallVip: false,
	share_time
} );

const urlParams = urlParamsGet( location.href );
const data = ref<LiveUserInfo & BiliLiveInfo & { vip_status: number } | null>( null );

const getData = async () => {
	const res = await $http.Live.get( { uid: urlParams.uid } );
	data.value = {
		...res
	}

	state.name = <string>data.value?.name;
	state.liveRoom = data.value?.liveRoom;
	state.level = <string>data.value?.level;
	if ( data.value?.color ) {
		state.color = intToColor( <number>data.value?.color );
	}
	if ( data.value?.follower_num ) {
		const fan_num = data.value!.follower_num;
		if ( fan_num > 10000 ) {
			const number = Math.round( parseFloat( `${ fan_num / 10000 }` ) * 10 ) / 10;
			state.follower_num = `${ number }万`;
		} else {
			state.follower_num = `${ fan_num }`
		}
	}

	state.isOfficial = data.value?.official_type === 1;
	state.isPersonal = data.value?.official_type === 0;
	state.isBigVip = data.value?.vip_status === 1;
	state.isSmallVip = data.value?.vip_status === 1 && aprilFoolsDay;
}

onMounted( () => {
	getData();
} )
</script>

<template>
	<div id="app" class="live-box">
		<div class="live-main">
			<div class="live-preview">
				<img :src="state.liveRoom.cover" alt="视频预览图" class="live-preview-img">
				<img alt="视频预览图" class="live-play-icon" src="../../assets/img/ic_live_player_start.png">
			</div>
			<div class="live-desc-info">
				<h2>{{ state.liveRoom.title }}</h2>
				<div class="live-stat">
					<span>{{ state.liveRoom["area_v2_name"] }}</span>
					<span>|</span>
					<span>房间号:</span>
					<span>{{ state.liveRoom["room_id"] }}</span>
				</div>
			</div>
			<div class="box-main">
				<div class="author-info">
					<div class="avatar-box">
						<img :src="state.liveRoom.face" alt="avatar" class="avatar-img"/>
						<span v-if="state.isOfficial" class="author-icon bili-avatar-icon-business"></span>
						<span v-else-if="state.isPersonal" class="author-icon bili-avatar-icon-personal"></span>
						<span v-else-if="state.isSmallVip" class="author-icon bili-avatar-icon-small-vip"></span>
						<span v-else-if="state.isBigVip" class="author-icon bili-avatar-icon-big-vip"></span>
					</div>
					<div class="user-info" style="margin-left: 10px;">
						<div style="display: flex; align-items: center;">
							<span style="font-size: 18px;margin-right: 10px;font-weight: 400;">{{ state.name }}</span>
							<span class="live-icon">
							<span class="live-status" style="">直播中</span>
						</span>
						</div>
						<div style="display: flex; align-items: center">
							<span :style="{borderColor: state.color, color: state.color}"
							      class="live-up-level">UP {{ state.level }}</span>
							<span v-if="state.follower_num"
							      style="color: var(--Ga5); font-size: 14px;">{{ state.follower_num }}粉丝</span>
						</div>
					</div>
				</div>
			</div>
		</div>
		<div class="live-share-time">分享于{{ share_time }}</div>
		<VideoQRCode :url="state.liveRoom.url">
			<div class="live-footer">
				<div><img alt="logo" src="../../assets/img/ic_logo_default.png"></div>
				<span class="live-footer-text">你感兴趣的视频都在B站</span>
			</div>
		</VideoQRCode>
	</div>
</template>

<style src="../../assets/styles/root.css"/>
<style src="../../assets/styles/qrcode.css"/>
<style src="../../assets/styles/avatar.css"/>
<style src="../../assets/styles/live.css"/>

<style lang="scss" scoped>
#app {
	width: 480px;
}

@font-face {
	font-family: 'fanscard';
	src: url('//s1.hdslb.com/bfs/static/jinkela/mall-h5/asserts/fansCard.ttf');
}

@font-face {
	font-family: "HN-Font";
	src: url("../../assets/fonts/HN-Font.woff2") format("woff2"),
	url("../../assets/fonts/HN-Font.woff") format("woff"),
	url("../../assets/fonts/HN-Font.ttf"),
	url("../../assets/fonts/HN-Font.ttc");
}

body, html {
	font-family: HN-Font, PingFang SC, Helvetica Neue, Helvetica, Arial, Microsoft Yahei, Hiragino Sans GB, Heiti SC, WenQuanYi Micro Hei, sans-serif;
	background-color: #fff;
}

div {
	box-sizing: border-box;
}

svg {
	fill: currentColor;
	height: 1em;
	width: 1em;
}

svg:not(:root) {
	overflow-clip-margin: content-box;
	overflow: hidden;
}

img {
	overflow-clip-margin: content-box;
	overflow: clip;
}
</style>