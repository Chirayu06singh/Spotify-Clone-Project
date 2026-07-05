
let currentSong = new Audio();
let songs;
let currFolder;

function secondsToMinutesSeconds(seconds) {
    if (isNaN(seconds) || seconds < 0) {
        return "00:00";
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(remainingSeconds).padStart(2, '0');

    return `${formattedMinutes}:${formattedSeconds}`;
}

async function getSongs(folder) {
    // Standardize the active directory string path 
    currFolder = folder.replaceAll("\\", "/");
    
    let a = await fetch(`/${currFolder}/`);
    let response = await a.text();
    let div = document.createElement("div");
    div.innerHTML = response;
    let as = div.getElementsByTagName("a");
    songs = [];
    
    for (let index = 0; index < as.length; index++) {
        const element = as[index];
        if (element.href.endsWith(".mp3")) {
            // 1. Force the browser to decode the hidden %5C characters back into real backslashes
            let decodedHref = decodeURIComponent(element.href);
            
            // 2. NOW we can safely flip all backslashes into standard web forward slashes
            let normalizedPath = decodedHref.replaceAll("\\", "/");
            
            // 3. Extract ONLY the clean trailing file name
            let pureFileName = normalizedPath.split("/").pop();
            
            songs.push(pureFileName);
        }
    }

    // Show all the songs in the library sidebar
    let songUL = document.querySelector(".songList").getElementsByTagName("ul")[0];
    songUL.innerHTML = "";
    
    for (const song of songs) {
        // Strip out codes and file extension tags exclusively for presentation
        let cleanDisplayName = decodeURIComponent(song).replace(".mp3", "");
        
        songUL.innerHTML += `
            <li>
                <img class="invert" width="34" src="img/music.svg" alt="">
                <div class="info">
                    <div>${cleanDisplayName}</div>
                    <div>Harry</div>
                </div>
                <div class="playnow">
                    <span>Play Now</span>
                    <img class="invert" src="img/play.svg" alt="">
                </div>
            </li>`;
    }

    // Attach click listener to each individual list item in the library
    Array.from(document.querySelector(".songList").getElementsByTagName("li")).forEach(e => {
        e.addEventListener("click", () => {
            let selectedSongName = e.querySelector(".info").firstElementChild.innerHTML.trim();
            
            // Find the item matching the target display name
            let exactTrack = songs.find(s => decodeURIComponent(s).includes(selectedSongName));
            if (exactTrack) {
                playMusic(exactTrack);
            }
        });
    });

    return songs;
}

const playMusic = (track, pause = false) => {
    // Explicitly clean parent folder string variables before joining path literals
    let cleanFolder = currFolder.replaceAll("\\", "/");
    
    // Explicitly check for any accidental root slashes to construct an accurate URL path layout string
    currentSong.src = `/${cleanFolder}/${track}`;
    
    if (!pause) {
        currentSong.play().catch(err => console.log("Playback interrupted or blocked:", err));
        if (typeof play !== 'undefined' && play) {
            play.src = "img/pause.svg";
        }
    }
    
    // Clean up display labels on player visual bar UI fields
    document.querySelector(".songinfo").innerHTML = decodeURI(track).replace(".mp3", "");
    document.querySelector(".songtime").innerHTML = "00:00 / 00:00";
}

async function displayAlbums() {
    console.log("displaying albums");
    
    let a = await fetch(`/songs/`);
    let response = await a.text();
    let div = document.createElement("div");
    div.innerHTML = response;
    let anchors = div.getElementsByTagName("a");
    let cardContainer = document.querySelector(".cardContainer");
    cardContainer.innerHTML = ""; 
    
    let array = Array.from(anchors);
    
    for (let index = 0; index < array.length; index++) {
        const e = array[index];
        
        // Grab the RAW attribute
        let rawHref = e.getAttribute("href");
        
        // Skip empty links, parent directories, or hidden files
        if (!rawHref || rawHref === "../" || rawHref === "/" || rawHref.includes(".htaccess")) {
            continue;
        }

        // CRITICAL FIX: Decode any %5C and flip all backslashes to forward slashes first
        let normalizedUrl = decodeURIComponent(rawHref).replaceAll("\\", "/");
        
        // NOW we can safely clean the path and extract just the folder name (e.g., "angry_mood")
        let cleanUrl = normalizedUrl.replace(/\/$/, ""); 
        let folder = cleanUrl.split("/").pop();
        
        // Skip the root songs folder itself if it accidentally gets caught
        if (folder === "songs" || folder === "") continue;

        try {
            // Fetch info.json using the absolute root path and our clean folder name
            let infoFetch = await fetch(`/songs/${folder}/info.json`);
            
            // If there's no info.json, skip this folder gracefully instead of crashing
            if (!infoFetch.ok) {
                console.log(`Skipping ${folder} - no info.json found`);
                continue;
            }

            let albumInfo = await infoFetch.json();
            
            // Generate the card
            cardContainer.innerHTML += `
                <div data-folder="${folder}" class="card">
                    <div class="play">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M5 20V4L19 12L5 20Z" stroke="#141B34" fill="#000" stroke-width="1.5" stroke-linejoin="round" />
                        </svg>
                    </div>
                    <img src="/songs/${folder}/cover.jpg" alt="${albumInfo.title} cover">
                    <h2>${albumInfo.title}</h2>
                    <p>${albumInfo.description}</p>
                </div>`;
        } catch (error) {
            console.error(`Error parsing data for folder: ${folder}`, error);
        }
    }

    // Attach click events to load the new playlist on the left
    Array.from(document.getElementsByClassName("card")).forEach(e => {
        e.addEventListener("click", async (item) => {
            let targetedFolder = item.currentTarget.dataset.folder;
            songs = await getSongs(`songs/${targetedFolder}`);
            playMusic(songs[0]);
        });
    });
}


async function main() {
    // Get the list of all the songs
    songs = await getSongs("songs/angry_mood")
    playMusic(songs[0], true)

    // Display all the albums on the page
    await displayAlbums()


    // Attach an event listener to play, next and previous
    play.addEventListener("click", () => {
        if (currentSong.paused) {
            currentSong.play()
            play.src = "img/pause.svg"
        }
        else {
            currentSong.pause()
            play.src = "img/play.svg"
        }
    })

    // Listen for timeupdate event
    currentSong.addEventListener("timeupdate", () => {
        document.querySelector(".songtime").innerHTML = `${secondsToMinutesSeconds(currentSong.currentTime)} / ${secondsToMinutesSeconds(currentSong.duration)}`
        document.querySelector(".circle").style.left = (currentSong.currentTime / currentSong.duration) * 100 + "%";
    })

    // Add an event listener to seekbar
    document.querySelector(".seekbar").addEventListener("click", e => {
        let percent = (e.offsetX / e.target.getBoundingClientRect().width) * 100;
        document.querySelector(".circle").style.left = percent + "%";
        currentSong.currentTime = ((currentSong.duration) * percent) / 100
    })

    // Add an event listener for hamburger
    document.querySelector(".hamburger").addEventListener("click", () => {
        document.querySelector(".left").style.left = "0"
    })

    // Add an event listener for close button
    document.querySelector(".close").addEventListener("click", () => {
        document.querySelector(".left").style.left = "-120%"
    })

    // Add an event listener to previous
    previous.addEventListener("click", () => {
        currentSong.pause();
        console.log("Previous clicked");

        let index = songs.findIndex(song => currentSong.src.includes(song));
        if (index !== -1) {
            let prevIndex = (index - 1 + songs.length) % songs.length;
            playMusic(songs[prevIndex]);
        }
    })

    // Add an event listener to next
    next.addEventListener("click", () => {
        currentSong.pause();
        console.log("Next clicked");

        let index = songs.findIndex(song => currentSong.src.includes(song));
        if (index !== -1) {
            let nextIndex = (index + 1) % songs.length;
            playMusic(songs[nextIndex]);
        }
    })

    // Add an event to volume
    document.querySelector(".range").getElementsByTagName("input")[0].addEventListener("change", (e) => {
        console.log("Setting volume to", e.target.value, "/ 100")
        currentSong.volume = parseInt(e.target.value) / 100
        if (currentSong.volume > 0) {
            document.querySelector(".volume>img").src = document.querySelector(".volume>img").src.replace("img/mute.svg", "img/volume.svg")
        }
    })

    // Add event listener to mute the track
    document.querySelector(".volume>img").addEventListener("click", e => {
        if (e.target.src.includes("img/volume.svg")) {
            e.target.src = e.target.src.replace("img/volume.svg", "img/mute.svg")
            currentSong.volume = 0;
            document.querySelector(".range").getElementsByTagName("input")[0].value = 0;
        }
        else {
            e.target.src = e.target.src.replace("img/mute.svg", "img/volume.svg")
            currentSong.volume = .10;
            document.querySelector(".range").getElementsByTagName("input")[0].value = 10;
        }

    })





}

main() 