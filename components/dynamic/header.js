const template = `<div class="box-main">
<div class="author-info">
	<div class="avatar-box">
		<img class="avatar-img" :src="avatarImg" alt="avatar"/>
	<div class="avatar-pendant-dom" v-if="pendant.image_enhance">
		<img class="avatar-pendant" :src="avatarPendant" alt="pendant"/>
	</div>
	<span class="author-icon bili-avatar-icon-business" v-if="isOfficial"></span>
	<span class="author-icon bili-avatar-icon-personal" v-else-if="isPersonal"></span>
	<span class="author-icon bili-avatar-icon-small-vip" v-else-if="isSmallVip"></span>
	<span class="author-icon bili-avatar-icon-big-vip" v-else-if="isBigVip"></span>
	</div>
	<div class="user-info">
		<span class="nickname" :style="{color: vip.nickname_color}">{{name}}</span>
		<span class="publish_time">{{pubTime}}</span>
		<slot/>
	</div>
</div>
<div class="decorate-dom" v-if="decorate">
	<img class="decorate-img" :src="decorate.card_url" alt="decorate"/>
	<span :style="{color: decorate.fan.color}">{{decorate.fan.num_str}}</span>
</div>
</div>`;

import { toHumanize } from "../../public/js/utils.js";

const { defineComponent, reactive, toRefs } = Vue;

export default defineComponent( {
	name: "Header",
	template,
	props: {
		avatar: Object,
		decorate: Object,
		face_nft: Boolean,
		following: Boolean,
		label: String,
		official_verify: Object,
		pendant: Object,
		pub_location_text: String,
		vip: Object,
		mid: Number,
		face: String,
		name: String,
		jump_url: String,
		pub_action: String,
		pub_time: String,
		pub_ts: Number,
		type: String
	},
	setup( props ) {
		const date = new Date();
		const aprilFoolsDay = date.getMonth() + 1 === 4 && date.getDay() === 1;
		
		const state = reactive( {
			avatarImg: `${ props.face }@96w_96h_1c_1s.webp`,
			avatarPendant: `${ props.pendant.image_enhance }@144w_144h.webp`,
			pubTime: toHumanize( props.pub_ts ),
			isOfficial: props.official_verify.type === 1,
			isPersonal: props.official_verify.type === 0,
			isBigVip: props.vip.status === 1,
			isSmallVip: props.vip.status === 1 && aprilFoolsDay
		} );
		
		return {
			...toRefs( state )
		};
	}
} );