const template = `<div class="container">
	<header>
		<img :src="banner" />
	</header>
	<main>
		<h3>NEWS</h3>
		<div class="title">
			<p class="time-left"></p>
			<h1>{{ title }}</h1>
			<p class="time-right">
				<span>{{ year }}</span>
				<span>{{ time }}</span>
			</p>
		</div>
		<ul class="content">
			<li v-for="( item, key ) of data" :key="key">
				<span v-if="key !== data.length - 1">{{ key + 1 }}、 </span>
				<span>{{ item }}</span>
			</li>
		</ul>
	</main>
</div>`;

const { defineComponent, reactive, toRefs, onMounted } = Vue;

export default defineComponent( {
	name: "App",
	template,
	setup() {
		const state = reactive( {
			year: new Date().getFullYear() + "年",
			banner: "",
			title: "",
			time: "",
			data: []
		} );

		onMounted( async () => {
			await getData();
		} )

		async function getData() {
			const res = await fetch( "/hot-news/api/sixty" );
			const data = await res.json();
			state.banner = data.banner || "";
			state.title = data.title || "在这里每天60秒读懂世界"
			state.time = data.time || ""
			state.data = data.data || []
		}

		return {
			...toRefs( state )
		}
	}
} );