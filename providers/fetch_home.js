async function main() {
    const res = await fetch('https://vitaminagg.vip');
    const text = await res.text();
    const titles = text.match(/<h2 class="Title">([^<]+)/g) || [];
    console.log(titles.slice(0, 10));
}
main().catch(console.error);
