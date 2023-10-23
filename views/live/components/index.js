const template = `
<div class="live-box">
	<div class="live-main">
		<div class="live-preview">
			<img :src="liveRoom.cover" alt="视频预览图" class="live-preview-img">
			<img src="/hot-news/assets/img/ic_live_player_start.png" alt="视频预览图" class="live-play-icon">
		</div>
		<div class="live-desc-info">
			<h2>{{liveRoom.title}}</h2>
			<div class="live-stat">
				<span>{{liveRoom.area_v2_name}}</span>
				<span>|</span>
				<span>房间号:</span>
				<span>{{liveRoom.room_id}}</span>
			</div>
		</div>
		<div class="box-main">
			<div class="author-info">
				<div class="avatar-box">
					<img class="avatar-img" :src="liveRoom.face" alt="avatar"/>
					<span class="author-icon bili-avatar-icon-business" v-if="isOfficial"></span>
					<span class="author-icon bili-avatar-icon-personal" v-else-if="isPersonal"></span>
					<span class="author-icon bili-avatar-icon-small-vip" v-else-if="isSmallVip"></span>
					<span class="author-icon bili-avatar-icon-big-vip" v-else-if="isBigVip"></span>
				</div>
				<div class="user-info" style="margin-left: 10px;">
					<div style="display: flex; align-items: center;">
						<span style="font-size: 18px;margin-right: 10px;font-weight: 400;">{{name}}</span>
						<span class="live-icon">
							<span style="" class="live-status">直播中</span>
						</span>
					</div>
					<div style="display: flex; align-items: center">
						<span :style="{borderColor: color, color}" class="live-up-level">UP {{level}}</span>
						<span style="color: var(--Ga5); font-size: 14px;" v-if="follower_num">{{follower_num}}粉丝</span>
					</div>
				</div>
			</div>
		</div>
	</div>
	<div class="live-share-time">分享于{{share_time}}</div>
	<VideoQRCode :url="liveRoom.url">
		<div class="live-footer">
			<div><img src="/hot-news/assets/img/ic_logo_default.png" alt="logo"></div>
			<span class="live-footer-text">你感兴趣的视频都在B站</span>
		</div>
	</VideoQRCode>
</div>`;

import getServer from "../../../assets/js/http.js";
import { urlParamsGet } from "../../../assets/js/url.js";
import { intToColor, toHumanize } from "../../../assets/js/utils.js";
import VideoQRCode from "../../../components/video_qrcode.js"
import { defineComponent, reactive, toRefs } from "vue";

export default defineComponent( {
	name: "App",
	template,
	components: {
		VideoQRCode,
	},
	setup() {
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
		const urlParams = urlParamsGet( location.search );
		const data = getServer( `/live?uid=${ urlParams.uid }` );
		state.name = data.name;
		state.liveRoom = data.liveRoom;
		state.level = data.level;
		if ( data.color ) {
			state.color = intToColor( data.color );
		}
		if ( data.follower_num ) {
			const fan_num = data.follower_num;
			if ( fan_num > 10000 ) {
				const number = Math.round( parseFloat( `${ fan_num / 10000 }` ) * 10 ) / 10;
				state.follower_num = `${ number }万`;
			} else {
				state.follower_num = `${ fan_num }`
			}
		}
		
		state.isOfficial = data.official_type === 1;
		state.isPersonal = data.official_type === 0;
		state.isBigVip = date.vip_status === 1;
		state.isSmallVip = date.vip_status === 1 && aprilFoolsDay;
		return { ...toRefs( state ) }
	}
} );
