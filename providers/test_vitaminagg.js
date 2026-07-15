const { getStreams } = require('./vitaminagg');

async function main() {
    console.log("Testing movie: Inside Out 2");
    let streams = await getStreams("1022789", "movie", null, null, "Intensa-mente 2");
    console.log(streams);

    console.log("Testing movie: Kung Fu Panda 4");
    streams = await getStreams("1011985", "movie", null, null, "Kung Fu Panda 4");
    console.log(streams);
}

main().catch(console.error);
