const template = `<div class="bili-dyn-content__orig__author">
<div class="dyn-orig-author">
	<div class="dyn-orig-author__left">
		<div class="dyn-orig-author__face">
			<img :src="avatarImg" alt="avatar" class="dyn-orig-author__face__img bili-awesome-img"/>
		</div>
		<span class="dyn-orig-author__name fs-medium" :style="{color: nicknameColor}">{{name}}</span>
    </div>
</div>
</div>`;

const { defineComponent, ref } = Vue;

export default defineComponent( {
	name: "Face",
	template,
	props: {
		avatar: String,
		name: String,
		nicknameColor: String
	},
	setup( props ) {
		const avatarImg = ref( `${ props.avatar }@48w_48h_1c.webp` );
		return { avatarImg };
	}
} );