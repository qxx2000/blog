    const count = 1000;
    let scene, camera, renderer;
    let mouseX = 0, mouseY = 0;
    let windowHalfX = window.innerWidth / 2;
    let windowHalfY = window.innerHeight / 2;
    let isAnimating = true;
    let animationFrameId = null;
    let geometry, position, positionArray, velocity, velocityArray;
    let currentPage = 2;
    let isPlaying = false;
    let audio;
    let currentBgRecord = 'black';
    let avatarSound = null;
    let clock;

    async function initAvatarSound() {
        const audioUrl = "https://cdn.jsdelivr.net/gh/qxx2000/blog@main/img/Cat.wav";
        try {
            const response = await fetch(audioUrl);
            const audioBlob = await response.blob();
            const blobUrl = URL.createObjectURL(audioBlob);
            avatarSound = new Audio(blobUrl);
            avatarSound.volume = 0.35;
        } catch (error) {
            console.warn("音频预加载失败，降级为传统方式:", error);
            avatarSound = new Audio(audioUrl);
            avatarSound.volume = 0.35;
        }
    }

    if (window.requestIdleCallback) {
        requestIdleCallback(initAvatarSound);
    } else {
        setTimeout(initAvatarSound, 2000);
    }

    window.isParticlesEnabled = true;
    window.userToggledParticles = false;

    function updateParticlesDisplay() {
        const canvas = document.getElementById('dynamicParticlesCanvas');
        const sCanvas = document.getElementById('shuicheCanvas');
        if (window.isParticlesEnabled) {
            if (canvas) canvas.style.display = 'block';
            if (sCanvas) sCanvas.style.display = 'block';
            isAnimating = true;
            if (typeof scene !== 'undefined' && scene && camera && renderer && animationFrameId === null) {
                animeThreeJS();
            }
        } else {
            if (canvas) canvas.style.display = 'none';
            if (sCanvas) sCanvas.style.display = 'none';
            isAnimating = false;
            if (animationFrameId !== null) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
        }
    }

    (function initDoubleClickToggle() {
        let lastToggleTime = 0;
        function toggleParticles(e) {
            let now = new Date().getTime();
            if (now - lastToggleTime < 500) return;
            lastToggleTime = now;
            if (e.target && e.target.closest && e.target.closest('#oneko, #oneko-skin-menu, a, button, svg, img, video, .bullet, .link-card, .spotify-card, .play-btn, .theme-toggle, .day-toggle')) { return; }
            window.isParticlesEnabled = !window.isParticlesEnabled;
            window.userToggledParticles = true;
            updateParticlesDisplay();
        }
        document.addEventListener('dblclick', toggleParticles);

        let lastTouchEnd = 0;
        let isMultiTouch = false;

        document.addEventListener('touchstart', function(e) {
            if (e.touches.length > 1) {
                isMultiTouch = true;
            }
        }, { passive: true });

        document.addEventListener('touchend', function(e) {
            if (e.touches.length > 0) return;
            if (isMultiTouch) {
                isMultiTouch = false;
                lastTouchEnd = 0;
                return;
            }
            let now = new Date().getTime();
            if (now - lastTouchEnd <= 400) {
                toggleParticles(e);
                lastTouchEnd = 0;
            } else {
                lastTouchEnd = now;
            }
        });
    })();

    function preloadImages(urls) {
        urls.forEach(url => { const img = new Image(); img.src = url; });
    }

    function switchPageTo(page) {
        if (page < 1 || page > 3) return;
        currentPage = page;
        const pages = document.querySelector('.pages');
        pages.style.transform = `translateX(-${(page - 1) * 100}%)`;
        document.querySelectorAll('.bullet').forEach(b => b.classList.toggle('active', parseInt(b.dataset.page) === page));
    }

    let bgTransitionLayer = null;
    let bgTransitionTimer = null;

    function changeBackgroundImage(newBgUrl, isPureColor = false) {
        if (!bgTransitionLayer) {
            bgTransitionLayer = document.createElement('div');
            bgTransitionLayer.id = 'bg-transition-layer';
            bgTransitionLayer.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; height: 100dvh; z-index: -2;
                pointer-events: none; opacity: 0; transition: opacity 0.8s ease-in-out;
                background-size: cover; background-position: center; background-attachment: fixed;
                will-change: opacity;
            `;
            document.body.prepend(bgTransitionLayer);
        }

        if (bgTransitionTimer) {
            clearTimeout(bgTransitionTimer);
        }

        const isGradient = isPureColor && newBgUrl.includes('gradient');
        bgTransitionLayer.style.backgroundImage = '';
        bgTransitionLayer.style.backgroundColor = '';

        if (isGradient) {
            bgTransitionLayer.style.backgroundImage = newBgUrl;
        } else if (isPureColor) {
            bgTransitionLayer.style.backgroundColor = newBgUrl;
        } else {
            bgTransitionLayer.style.backgroundImage = `url('${newBgUrl}')`;
        }

        void bgTransitionLayer.offsetWidth;
        bgTransitionLayer.style.opacity = '1';

        bgTransitionTimer = setTimeout(() => {
            document.body.style.background = '';
            document.body.style.backgroundImage = '';
            document.body.style.backgroundColor = '';
            if (isGradient) {
                document.body.style.backgroundImage = newBgUrl;
                document.body.style.backgroundSize = 'cover';
                document.body.style.backgroundPosition = 'center';
                document.body.style.backgroundAttachment = 'fixed';
            } else if (isPureColor) {
                document.body.style.backgroundColor = newBgUrl;
            } else {
                document.body.style.background = `url('${newBgUrl}') center/cover fixed`;
            }
            currentBgRecord = newBgUrl;
            bgTransitionLayer.style.opacity = '0';
            bgTransitionTimer = null;
        }, 800);
    }

    function toggleTheme(theme) {
        if (theme === 'light') {
            document.body.classList.add('light');
            document.body.classList.remove('dark');
            if (renderer) renderer.setClearColor(0x000000, 0);
            changeBackgroundImage('https://cdn.jsdelivr.net/gh/qxx2000/blog@main/img/000.jpg');
            document.documentElement.style.setProperty('--fg', 'black');
            if (!window.userToggledParticles) window.isParticlesEnabled = false;
            updateParticlesDisplay();
        } else {
            document.body.classList.remove('light');
            document.body.classList.add('dark');
            if (renderer) renderer.setClearColor(0x000000, 0);
            changeBackgroundImage('black', true);
            document.documentElement.style.setProperty('--fg', 'white');
            if (!window.userToggledParticles) window.isParticlesEnabled = true;
            updateParticlesDisplay();
        }
    }

    function switchBackground(url, isPureColor = false) {
        changeBackgroundImage(url, isPureColor);
        document.body.classList.add('light');
        document.body.classList.remove('dark');
        if (renderer) renderer.setClearColor(0x000000, 0);
        document.documentElement.style.setProperty('--fg', 'black');
        if (!window.userToggledParticles) window.isParticlesEnabled = false;
        updateParticlesDisplay();
    }

    function toggleReward() {
        document.getElementById('page1-1').classList.toggle('show-qr');
    }

    function triggerConfetti() {
        if(typeof confetti === 'function') {
            confetti({ particleCount: 150, spread: 100 });
        }
    }

    function togglePlay(button) {
        if (!audio) audio = document.getElementById('audioPlayer');
        if (isPlaying) {
            audio.pause();
            button.classList.remove('playing');
            button.innerHTML = `
                <svg viewBox="0 0 16 16" fill="white">
                    <path d="M3 13.1231V2.87688C3 1.42024 4.55203 0.520516 5.77196 1.26995L14.1114 6.39307C15.2962 7.12093 15.2962 8.87907 14.1114 9.60693L5.77196 14.73C4.55203 15.4795 3 14.5798 3 13.1231Z"/>
                </svg> Play`;
        } else {
            audio.play();
            button.classList.add('playing');
            button.innerHTML = `
                <svg viewBox="0 0 16 16" fill="white">
                    <path d="M4 2H6V14H4V2ZM10 2H12V14H10V2Z"/>
                </svg> Pause`;
        }
        isPlaying = !isPlaying;
    }

    function initThreeJS() {
        clock = new THREE.Clock();
        geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6 * count), 3));
        geometry.setAttribute('velocity', new THREE.BufferAttribute(new Float32Array(2 * count), 1));
        position = geometry.getAttribute('position');
        positionArray = position.array;
        velocity = geometry.getAttribute('velocity');
        velocityArray = velocity.array;

        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(80, window.innerWidth / window.innerHeight, 1, 500);
        camera.position.z = 200;

        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.domElement.id = 'dynamicParticlesCanvas';
        renderer.domElement.style.display = window.isParticlesEnabled ? 'block' : 'none';

        document.body.appendChild(renderer.domElement);

        for (let i = 0; i < count; i++) {
            const x = Math.random() * 800 - 400;
            const y = Math.random() * 800 - 400;
            const z = Math.random() * 400 - 200;
            positionArray[6 * i] = x; positionArray[6 * i + 1] = y; positionArray[6 * i + 2] = z;
            positionArray[6 * i + 3] = x; positionArray[6 * i + 4] = y; positionArray[6 * i + 5] = z;
            velocityArray[2 * i] = 0; velocityArray[2 * i + 1] = 0;
        }

        const material = new THREE.LineBasicMaterial({ color: 0xffffff });
        const lines = new THREE.LineSegments(geometry, material);
        scene.add(lines);

        window.addEventListener('resize', resizeThreeJS, false);
        document.body.addEventListener('pointermove', onPointerMove);
        animeThreeJS();
    }

    function resizeThreeJS() {
        if (!camera || !renderer) return;
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        windowHalfX = window.innerWidth / 2;
        windowHalfY = window.innerHeight / 2;
    }

    function animeThreeJS() {
        if (!isAnimating || !clock) return;
        let delta = clock.getDelta();
        delta = Math.min(delta, 0.1);
        const timeScale = delta / (1 / 60);
        for (let i = 0; i < count; i++) {
            velocityArray[2 * i] += 0.015 * timeScale;
            velocityArray[2 * i + 1] += 0.015 * timeScale;
            positionArray[6 * i + 2] += (velocityArray[2 * i] + 0.03) * timeScale;
            positionArray[6 * i + 5] += velocityArray[2 * i + 1] * timeScale;
            if (positionArray[6 * i + 2] > 200) {
                const z = Math.random() * 200 - 200;
                positionArray[6 * i + 2] = z;
                positionArray[6 * i + 5] = z;
                velocityArray[2 * i] = 0;
                velocityArray[2 * i + 1] = 0;
            }
        }
        position.needsUpdate = true;
        renderThreeJS();
        animationFrameId = requestAnimationFrame(animeThreeJS);
    }

    function renderThreeJS() {
        if (!camera || !renderer) return;
        camera.position.x += (-mouseX * 0.1 - camera.position.x) * 0.02;
        camera.position.y += (-mouseY * 0.1 - camera.position.y) * 0.02;
        camera.lookAt(scene.position);
        renderer.render(scene, camera);
    }

    function onPointerMove(event) {
        mouseX = event.clientX - windowHalfX;
        mouseY = event.clientY - windowHalfY;
    }

    function loadMusicPlayer() {
        let indexSong = 0;
        let pendingCurrentTime = 0;
        let isLocked = false;
        let songsLength = null;
        let selectedSong = null;
        let songIsPlayed = false;
        let progress_elmnt = null;
        let songName_elmnt = null;
        let sliderImgs_elmnt = null;
        let singerName_elmnt = null;
        let musicPlayerInfo_elmnt = null;
        let progressBarIsUpdating = false;
        let broadcastGuarantor_elmnt = null;
        let isSwitchingMusic = false;
        let preloadAbortController = null;
        const root = document.querySelector("#root");
        const mainAudio = document.getElementById('mainAudio');

        function savePlaybackState() {
            if (!selectedSong) return;
            const playbackState = {
                currentSongIndex: indexSong,
                isPlaying: !selectedSong.paused,
                volume: selectedSong.volume,
                currentTime: pendingCurrentTime > 0 ? pendingCurrentTime : selectedSong.currentTime
            };
            localStorage.setItem('musicPlayerState', JSON.stringify(playbackState));
        }

        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') savePlaybackState();
        });
        window.addEventListener('beforeunload', savePlaybackState);
        setInterval(savePlaybackState, 5000);

        function updateUIForSong(index) {
            updateInfo(songName_elmnt, songs[index].songName);
            updateInfo(singerName_elmnt, songs[index].artist);
            setProperty(sliderImgs_elmnt, "--index", -index);
            if ('mediaSession' in navigator) {
                navigator.mediaSession.metadata = new MediaMetadata({
                    title: songs[index].songName,
                    artist: songs[index].artist,
                    artwork:[{ src: songs[index].files.cover, sizes: '512x512', type: 'image/jpeg' }]
                });
            }
        }

        function restorePlaybackState() {
            try {
                const savedState = localStorage.getItem('musicPlayerState');
                if (!savedState) {
                    updateUIForSong(0);
                    return;
                }
                const playbackState = JSON.parse(savedState);
                if (playbackState.currentSongIndex !== undefined &&
                    playbackState.currentSongIndex >= 0 &&
                    playbackState.currentSongIndex <= songsLength) {
                    indexSong = playbackState.currentSongIndex;
                    if (playbackState.currentTime !== undefined) pendingCurrentTime = playbackState.currentTime;
                    if (playbackState.volume !== undefined) mainAudio.volume = playbackState.volume;
                    updateUIForSong(indexSong);
                } else {
                    updateUIForSong(0);
                }
            } catch (e) {
                updateUIForSong(0);
            }
        }

        function preloadNextSongHead(nextIndex) {
            if (!songs[nextIndex] || !songs[nextIndex].files.song) return;
            const nextUrl = songs[nextIndex].files.song;
            if (preloadAbortController) preloadAbortController.abort();
            preloadAbortController = new AbortController();
            fetch(nextUrl, {
                headers: { 'Range': 'bytes=0-524288' },
                signal: preloadAbortController.signal
            }).catch(err => {});
        }

        function handleChangeMusic({ isPrev = false, playListIndex = null }) {
            if (isLocked) return;
            let newIndex = playListIndex !== null ? playListIndex :
                          (isPrev ? indexSong - 1 : indexSong + 1);
            if (newIndex < 0) newIndex = songsLength;
            if (newIndex > songsLength) newIndex = 0;
            if (newIndex === indexSong) return;
            let wasPlaying = songIsPlayed;
            isSwitchingMusic = true;
            indexSong = newIndex;
            pendingCurrentTime = 0;
            updateUIForSong(indexSong);
            mainAudio.src = songs[indexSong].files.song;
            if (wasPlaying) {
                let playPromise = mainAudio.play();
                if (playPromise !== undefined) {
                    playPromise.then(() => {
                        isSwitchingMusic = false;
                    }).catch(e => {
                        isSwitchingMusic = false;
                        songIsPlayed = false;
                        broadcastGuarantor_elmnt.classList.remove("click");
                        if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
                    });
                }
                songIsPlayed = true;
                broadcastGuarantor_elmnt.classList.add("click");
                if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
                const nextIdx = (indexSong + 1) > songsLength ? 0 : indexSong + 1;
                preloadNextSongHead(nextIdx);
            } else {
                isSwitchingMusic = false;
                if (preloadAbortController) preloadAbortController.abort();
            }
            savePlaybackState();
        }

        function handlePlayMusic() {
            if (mainAudio.currentTime === mainAudio.duration && mainAudio.duration > 0) {
                handleChangeMusic({});
                return;
            }
            if (!mainAudio.src || mainAudio.src === window.location.href || mainAudio.src === "") {
                mainAudio.src = songs[indexSong].files.song;
                let playPromise = mainAudio.play();
                if (playPromise !== undefined) {
                    playPromise.catch(e => console.log(e));
                }
                songIsPlayed = true;
                broadcastGuarantor_elmnt.classList.add("click");
                if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
                const nextIdx = (indexSong + 1) > songsLength ? 0 : indexSong + 1;
                preloadNextSongHead(nextIdx);
            } else {
                if (mainAudio.paused) {
                    mainAudio.play();
                    const nextIdx = (indexSong + 1) > songsLength ? 0 : indexSong + 1;
                    preloadNextSongHead(nextIdx);
                } else {
                    mainAudio.pause();
                }
            }
        }

        function updateTheProgressBar() {
            const duration = this.duration;
            const currentTime = this.currentTime;
            if (isNaN(duration) || duration === 0) return;
            const progressRatio = currentTime / duration;
            setProperty(progress_elmnt, "--scale", progressRatio);
            setProperty(progress_elmnt, "--width", `${progressRatio * 100}%`);
        }

        function syncMediaSessionPosition() {
            if ('mediaSession' in navigator && !isNaN(mainAudio.duration) && isFinite(mainAudio.duration) && mainAudio.duration > 0) {
                try {
                    let position = mainAudio.currentTime || 0;
                    position = Math.max(0, Math.min(position, mainAudio.duration));
                    navigator.mediaSession.setPositionState({
                        duration: mainAudio.duration,
                        playbackRate: mainAudio.playbackRate || 1,
                        position: position
                    });
                } catch (err) {}
            }
        }

        function handleSongEnded() {
            if (songIsPlayed) handleChangeMusic({});
        }

        function handleScrub(e) {
            e.preventDefault();
            let clientX = e.clientX;
            if (e.touches && e.touches.length > 0) clientX = e.touches[0].clientX;
            const progressOffsetLeft = progress_elmnt.getBoundingClientRect().left;
            const progressWidth = progress_elmnt.offsetWidth;
            const duration = selectedSong.duration;
            if (isNaN(duration) || duration === 0) return;
            selectedSong.currentTime = (clientX - progressOffsetLeft) / progressWidth * duration;
        }

        const songs =[
            { "bg": "#c9bea28f", "artist": "SCSI-9", "songName": "Senorita Tristeza", "files": { "song": "https://cdn.jsdelivr.net/gh/qxx2000/blog@main/music/Senorita Tristeza.mp3", "cover": "https://cdn.jsdelivr.net/gh/qxx2000/blog@main/music/Senorita Tristeza.webp" }, "duration": "5:53" },
            { "bg": "#0896eba1", "artist": "Paradox Interactive", "songName": "Be Happy", "files": { "song": "https://cdn.jsdelivr.net/gh/qxx2000/blog@main/music/Be Happy.mp3", "cover": "https://cdn.jsdelivr.net/gh/qxx2000/blog@main/music/Be Happy.webp" }, "duration": "3:22" },
            { "bg": "#ebbe03", "artist": "Flower Face", "songName": "Jupiter", "files": { "song": "https://cdn.jsdelivr.net/gh/qxx2000/blog@main/music/Jupiter.mp3", "cover": "https://cdn.jsdelivr.net/gh/qxx2000/blog@main/music/Jupiter.webp" }, "duration": "4:31" },
            { "bg": "#ffc382", "artist": "La Femme", "songName": "Le jardin", "files": { "song": "https://cdn.jsdelivr.net/gh/qxx2000/blog@main/music/Le jardin.mp3", "cover": "https://cdn.jsdelivr.net/gh/qxx2000/blog@main/music/Le jardin.webp" }, "duration": "4:00" },
            { "bg": "#ffcbdc", "artist": "Still Corners", "songName": "Crying", "files": { "song": "https://cdn.jsdelivr.net/gh/qxx2000/blog@main/music/Crying.mp3", "cover": "https://cdn.jsdelivr.net/gh/qxx2000/blog@main/music/Crying.webp" }, "duration": "3:28" },
            { "bg": "#44c16fb5", "artist": "Marvel83'", "songName": "Alone With You", "files": { "song": "https://cdn.jsdelivr.net/gh/qxx2000/blog@main/music/Alone With You.mp3", "cover": "https://cdn.jsdelivr.net/gh/qxx2000/blog@main/music/Alone With You.webp" }, "duration": "4:53" },
            { "bg": "#ff4545", "artist": "Timecop1983", "songName": "Nightfall", "files": { "song": "https://cdn.jsdelivr.net/gh/qxx2000/blog@main/music/Nightfall.mp3", "cover": "https://cdn.jsdelivr.net/gh/qxx2000/blog@main/music/Nightfall.webp" }, "duration": "4:40" },
            { "bg": "#e5e7e9", "artist": "Lazer Boomerang", "songName": "R3cover", "files": { "song": "https://cdn.jsdelivr.net/gh/qxx2000/blog@main/music/R3cover.mp3", "cover": "https://cdn.jsdelivr.net/gh/qxx2000/blog@main/music/R3cover.webp" }, "duration": "3:34" }
        ];

        const musicPlayer = document.createElement("div");
        musicPlayer.className = "music-player flex-column";
        const slider = document.createElement("div");
        slider.className = "slider center";
        slider.onclick = handleResizeSlider;
        const sliderContent = document.createElement("div");
        sliderContent.className = "slider__content center";
        const playlistButton = document.createElement("button");
        playlistButton.className = "music-player__playlist-button center button";
        playlistButton.innerHTML = '<i class="icon-playlist"></i>';
        const broadcastGuarantor = document.createElement("button");
        broadcastGuarantor.className = "music-player__broadcast-guarantor center button";
        broadcastGuarantor.onclick = handlePlayMusic;
        broadcastGuarantor.innerHTML = '<i class="icon-play"></i><i class="icon-pause"></i>';
        const sliderImgs = document.createElement("div");
        sliderImgs.className = "slider__imgs flex-row";
        songs.forEach(({ files: { cover }, songName }) => {
            const img = document.createElement("img");
            img.src = cover;
            img.loading = "lazy";
            img.className = "img";
            img.alt = songName;
            sliderImgs.appendChild(img);
        });
        sliderContent.append(playlistButton, broadcastGuarantor, sliderImgs);
        const sliderControls = document.createElement("div");
        sliderControls.className = "slider__controls center";
        const prevButton = document.createElement("button");
        prevButton.className = "slider__switch-button flex-row button";
        prevButton.innerHTML = '<i class="icon-back"></i>';
        prevButton.onclick = () => handleChangeMusic({ isPrev: true });
        const musicInfo = document.createElement("div");
        musicInfo.className = "music-player__info text_trsf-cap";
        musicInfo.innerHTML = `
            <div><div class="music-player__singer-name"><div>${songs[0].songName}</div></div></div>
            <div><div class="music-player__subtitle"><div>${songs[0].artist}</div></div></div>
        `;
        const nextButton = document.createElement("button");
        nextButton.className = "slider__switch-button flex-row button";
        nextButton.innerHTML = '<i class="icon-next"></i>';
        nextButton.onclick = () => handleChangeMusic({ isPrev: false });
        const progress = document.createElement("div");
        progress.className = "progress center";
        progress.onpointerdown = (e) => {
            e.preventDefault();
            handleScrub(e);
            progressBarIsUpdating = true;
        };
        const progressWrapper = document.createElement("div");
        progressWrapper.className = "progress__wrapper";
        const progressBar = document.createElement("div");
        progressBar.className = "progress__bar";
        const progressDot = document.createElement("div");
        progressDot.className = "progress__dot";
        progressWrapper.appendChild(progressBar);
        progressWrapper.appendChild(progressDot);
        progress.appendChild(progressWrapper);
        sliderControls.append(prevButton, musicInfo, nextButton, progress);
        slider.append(sliderContent, sliderControls);
        const playlist = document.createElement("ul");
        playlist.className = "music-player__playlist list";
        songs.forEach((song, index) => {
            const listItem = document.createElement("li");
            listItem.className = "music-player__song";
            listItem.onclick = () => handleChangeMusic({ playListIndex: index });
            listItem.innerHTML = `
                <div class="flex-row _align_center">
                    <img src="${song.files.cover}" loading="lazy" class="img music-player__song-img" alt="${song.songName}">
                    <div class="music-player__playlist-info text_trsf-cap">
                        <b class="text_overflow">${song.songName}</b>
                        <div class="flex-row _justify_space-btwn">
                            <span class="music-player__subtitle">${song.artist}</span>
                            <span class="music-player__song-duration">${song.duration}</span>
                        </div>
                    </div>
                </div>
            `;
            playlist.appendChild(listItem);
        });
        musicPlayer.append(slider, playlist);
        root.innerHTML = '';
        root.appendChild(musicPlayer);
        songsLength = songs.length - 1;
        progress_elmnt = document.querySelector(".progress");
        sliderImgs_elmnt = document.querySelector(".slider__imgs");
        songName_elmnt = document.querySelector(".music-player__singer-name");
        musicPlayerInfo_elmnt = document.querySelector(".music-player__info");
        singerName_elmnt = document.querySelector(".music-player__subtitle");
        broadcastGuarantor_elmnt = document.querySelector(".music-player__broadcast-guarantor");
        selectedSong = mainAudio;

        mainAudio.addEventListener('timeupdate', updateTheProgressBar);
        mainAudio.addEventListener('ended', handleSongEnded);
        mainAudio.addEventListener('loadedmetadata', () => {
            if (pendingCurrentTime > 0) {
                mainAudio.currentTime = pendingCurrentTime;
                pendingCurrentTime = 0;
            }
            syncMediaSessionPosition();
        });
        mainAudio.addEventListener('durationchange', syncMediaSessionPosition);
        mainAudio.addEventListener('play', () => {
            songIsPlayed = true;
            broadcastGuarantor_elmnt.classList.add("click");
            if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
            syncMediaSessionPosition();
        });
        mainAudio.addEventListener('pause', () => {
            setTimeout(() => {
                if (mainAudio.paused && !isSwitchingMusic) {
                    songIsPlayed = false;
                    broadcastGuarantor_elmnt.classList.remove("click");
                    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
                    syncMediaSessionPosition();
                }
            }, 100);
        });
        mainAudio.addEventListener('seeked', syncMediaSessionPosition);
        controlSubtitleAnimation(musicPlayerInfo_elmnt, songName_elmnt);
        controlSubtitleAnimation(musicPlayerInfo_elmnt, singerName_elmnt);
        setTimeout(restorePlaybackState, 100);

        if ('mediaSession' in navigator) {
            navigator.mediaSession.setActionHandler('previoustrack', () => handleChangeMusic({ isPrev: true }));
            navigator.mediaSession.setActionHandler('nexttrack', () => handleChangeMusic({ isPrev: false }));
            navigator.mediaSession.setActionHandler('play', () => {
                if (!mainAudio.src || mainAudio.src === window.location.href || mainAudio.src === "") {
                    handlePlayMusic.call(broadcastGuarantor_elmnt);
                } else {
                    mainAudio.play();
                }
            });
            navigator.mediaSession.setActionHandler('pause', () => {
                mainAudio.pause();
            });
            navigator.mediaSession.setActionHandler('seekto', (details) => {
                if (details.seekTime != null && !isNaN(mainAudio.duration)) {
                    mainAudio.currentTime = details.seekTime;
                }
            });
        }

        function handleResizeSlider({ target }) {
            if (isLocked) return;
            if (target.classList.contains("music-player__info")) {
                this.classList.add("resize");
                setProperty(this, "--controls-animate", "down running");
            } else if (target.classList.contains("music-player__playlist-button")) {
                this.classList.remove("resize");
                setProperty(this, "--controls-animate", "up running");
            }
        }

        function controlSubtitleAnimation(parent, child) {
            if (child.classList.contains("animate")) return;
            const element = child.firstChild;
            if (child.clientWidth > parent.clientWidth) {
                child.appendChild(element.cloneNode(true));
                child.classList.add("animate");
            }
            setProperty(child.parentElement, "width", `${element.clientWidth}px`);
        }

        function setProperty(target, prop, value = "") {
            target.style.setProperty(prop, value);
        }

        function updateInfo(target, value) {
            while (target.firstChild) target.removeChild(target.firstChild);
            const targetChild_elmnt = document.createElement("div");
            targetChild_elmnt.appendChild(document.createTextNode(value));
            target.appendChild(targetChild_elmnt);
            target.classList.remove("animate");
            controlSubtitleAnimation(musicPlayerInfo_elmnt, target);
        }

        handleResize();
        window.addEventListener("resize", handleResize);
        window.addEventListener("orientationchange", handleResize);
        window.addEventListener("transitionstart", ({ target }) => {
            if (target === sliderImgs_elmnt) {
                isLocked = true;
                setProperty(sliderImgs_elmnt, "will-change", "transform");
            }
        });
        window.addEventListener("transitionend", ({ target, propertyName }) => {
            if (target === sliderImgs_elmnt) isLocked = false;
            if (target.classList.contains("slider") && propertyName === "height") {
                controlSubtitleAnimation(musicPlayerInfo_elmnt, songName_elmnt);
                controlSubtitleAnimation(musicPlayerInfo_elmnt, singerName_elmnt);
            }
        });
        window.addEventListener("pointerup", () => {
            if (progressBarIsUpdating) {
                selectedSong.muted = false;
                progressBarIsUpdating = false;
            }
        });
        window.addEventListener("pointermove", (e) => {
            if (progressBarIsUpdating) {
                e.preventDefault();
                handleScrub(e);
                selectedSong.muted = true;
            }
        });
        window.addEventListener("touchend", () => {
            if (progressBarIsUpdating) {
                selectedSong.muted = false;
                progressBarIsUpdating = false;
            }
        });
        window.addEventListener("touchmove", (e) => {
            if (progressBarIsUpdating) {
                e.preventDefault();
                handleScrub(e);
                selectedSong.muted = true;
            }
        });
        function handleResize() {
            const vH = window.innerHeight * 0.01;
            setProperty(document.documentElement, "--vH", `${vH}px`);
        }
    }

    window.addEventListener('DOMContentLoaded', function() {
        toggleTheme('dark');
        loadMusicPlayer();
        switchPageTo(2);
        preloadImages(['https://cdn.jsdelivr.net/gh/qxx2000/blog@main/img/000.jpg']);
        const loadParticles = () => {
            const script = document.createElement('script');
            script.src = "https://cdn.jsdelivr.net/npm/three@0.132.2/build/three.min.js";
            script.onload = () => { initThreeJS(); };
            document.body.appendChild(script);
        };
        if (window.requestIdleCallback) { requestIdleCallback(loadParticles); }
        else { setTimeout(loadParticles, 300); }
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                isAnimating = false;
                if (animationFrameId) { cancelAnimationFrame(animationFrameId); animationFrameId = null; }
            } else {
                if (!isAnimating && window.isParticlesEnabled) {
                    isAnimating = true;
                    if (scene && camera && renderer) { animeThreeJS(); }
                }
            }
        });
        audio = document.getElementById('audioPlayer');
        audio.addEventListener('ended', () => {
            isPlaying = false;
            const btn = document.querySelector('.play-btn');
            if (btn) {
                btn.classList.remove('playing');
                btn.innerHTML = `
                    <svg viewBox="0 0 16 16" fill="white">
                        <path d="M3 13.1231V2.87688C3 1.42024 4.55203 0.520516 5.77196 1.26995L14.1114 6.39307C15.2962 7.12093 15.2962 8.87907 14.1114 9.60693L5.77196 14.73C4.55203 15.4795 3 14.5798 3 13.1231Z"/>
                    </svg> Play`;
            }
        });
        document.querySelectorAll('.theme-toggle, .day-toggle').forEach(button => {
            button.addEventListener('mouseenter', function() { this.style.transform = 'scale(1.2)'; });
            button.addEventListener('mouseleave', function() { this.style.transform = 'scale(1)'; });
            button.addEventListener('click', function() { setTimeout(() => { this.style.transform = 'scale(1)'; }, 350); });
        });
        document.querySelector('.sun-toggle').addEventListener('click', () => toggleTheme('light'));
        document.querySelector('.moon-toggle').addEventListener('click', () => toggleTheme('dark'));
        document.querySelector('.day-toggle-left').addEventListener('click', () => switchBackground('#9F79EE', true));
        document.querySelector('.day-toggle-right').addEventListener('click', () => {
            const gradient = 'linear-gradient(15.3deg, rgba(111, 71, 133, 1) 5.6%, rgba(232, 129, 166, 1) 19.6%, rgba(237, 237, 183, 1) 42.1%, rgba(244, 166, 215, 1) 63.7%, rgba(154, 219, 232, 1) 78.7%, rgba(238, 226, 159, 1) 96.8%)';
            const darkLayer = 'linear-gradient(rgba(0,0,0,0.15), rgba(0,0,0,0.15))';
            switchBackground(`${darkLayer}, ${gradient}`, true);
        });
        document.getElementById('page1-1').addEventListener('click', toggleReward);
        document.querySelectorAll('.qr-text').forEach(link => { link.addEventListener('click', (e) => e.stopPropagation()); });
        document.querySelector('.profile-pic').addEventListener('click', () => {
            triggerConfetti();
            if (avatarSound) {
                avatarSound.currentTime = 0;
                avatarSound.play();
            }
        });
        document.querySelector('.spotify-card').addEventListener('click', () => {
            window.open('https://open.spotify.com/track/3UkRfA9F62DYYDzqOskoov?si=MXIJN0wrQx24IS-qmyCUjg', '_blank');
        });
        document.querySelector('.play-btn').addEventListener('click', function(e) {
            e.stopPropagation();
            togglePlay(this);
        });
        document.querySelectorAll('.bullet').forEach(bullet => {
            bullet.addEventListener('click', function() {
                const pageNum = parseInt(this.getAttribute('data-page'));
                switchPageTo(pageNum);
            });
        });
        if (typeof ClipboardJS !== 'undefined') {
            const wechatID = "lllIIllllIIlIII";
            var clipboard = new ClipboardJS('#wechatBtn', { text: function() { return wechatID; } });
            clipboard.on('success', function(e) {
                alert('👉微信号复制成功,即将前往 微信WeChat !');
                window.location.href = 'weixin://';
            });
            clipboard.on('error', function(e) {
                alert('xxx' + wechatID);
                window.location.href = 'weixin://dl/scan';
            });
        }
    });

    document.addEventListener('keydown', function(event) {
        if (event.target.tagName.toLowerCase() === 'input' || event.target.tagName.toLowerCase() === 'textarea') {
            return;
        }
        const totalPages = document.querySelectorAll('.bullet').length;
        switch (true) {
            case event.key === 'ArrowLeft' && !event.shiftKey:
                let prevPage = currentPage - 1;
                if (prevPage < 1) prevPage = totalPages;
                switchPageTo(prevPage);
                break;
            case event.key === 'ArrowRight' && !event.shiftKey:
                let nextPage = currentPage + 1;
                if (nextPage > totalPages) nextPage = 1;
                switchPageTo(nextPage);
                break;
            case event.key === 'ArrowLeft' && event.shiftKey:
                const prevBtn = document.querySelectorAll('.slider__switch-button')[0];
                if (prevBtn) prevBtn.click();
                break;
            case event.key === 'ArrowRight' && event.shiftKey:
                const nextBtn = document.querySelectorAll('.slider__switch-button')[1];
                if (nextBtn) nextBtn.click();
                break;
            case event.code === 'Space':
                event.preventDefault();
                if (document.activeElement && document.activeElement.tabIndex === 0) {
                    document.activeElement.click();
                } else {
                    const mainPlayBtn = document.querySelector('.music-player__broadcast-guarantor');
                    if (mainPlayBtn) mainPlayBtn.click();
                }
                break;
            case ['t', '1', '2', '3', '4'].includes(event.key.toLowerCase()): {
                const btnSun = document.querySelector('.sun-toggle');
                const btnMoon = document.querySelector('.moon-toggle');
                const btnLeft = document.querySelector('.day-toggle-left');
                const btnRight = document.querySelector('.day-toggle-right');
                const simulateClick = (el) => {
                    if (!el) return;
                    const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
                    el.dispatchEvent(clickEvent);
                };
                if (event.key === '1') {
                    simulateClick(btnSun);
                } else if (event.key === '2') {
                    simulateClick(btnMoon);
                } else if (event.key === '3') {
                    simulateClick(btnLeft);
                } else if (event.key === '4') {
                    simulateClick(btnRight);
                } else {
                    if (currentBgRecord.includes('black')) {
                        simulateClick(btnSun);
                    } else if (currentBgRecord.includes('000.jpg')) {
                        simulateClick(btnLeft);
                    } else if (currentBgRecord.includes('#9F79EE')) {
                        simulateClick(btnRight);
                    } else {
                        simulateClick(btnMoon);
                    }
                }
                break;
            }
            case event.key.toLowerCase() === 'p':
                window.isParticlesEnabled = !window.isParticlesEnabled;
                window.userToggledParticles = true;
                updateParticlesDisplay();
                break;
            case event.key === 'Enter':
                if (document.activeElement && document.activeElement.tabIndex === 0) {
                    document.activeElement.click();
                }
                break;
        }
    });

    const style = document.createElement('style');
    style.textContent = `
        .glitch-text { position: relative; display: inline-block; }
        .glitch-text::before, .glitch-text::after { content: attr(data-text); position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0; pointer-events: none; }
        .glitch-text.active::before { animation: glitch-1 0.5s cubic-bezier(.25, .46, .45, .94) both infinite; color: #0ff; transform: translateX(-0.5px); }
        .glitch-text.active::after { animation: glitch-2 0.5s cubic-bezier(.25, .46, .45, .94) reverse both infinite; color: #f0f; transform: translateX(0.5px); }
        @keyframes glitch-1 { 0% { opacity: 0.75; transform: translate(-1px, 1px); } 50% { opacity: 0.5; transform: translate(0.5px, -0.5px); } 100% { opacity: 0.75; transform: translate(-1px, 1px); } }
        @keyframes glitch-2 { 0% { opacity: 0.75; transform: translate(1px, -1px); } 50% { opacity: 0.5; transform: translate(-0.5px, 0.5px); } 100% { opacity: 0.75; transform: translate(1px, -1px); } }
    `;
    document.head.appendChild(style);
    const linkCards = document.querySelectorAll('.link-card');
    linkCards.forEach(card => {
        const titleSpan = card.querySelector('.link-title');
        if (titleSpan && titleSpan.textContent) {
            const text = titleSpan.textContent.trim();
            titleSpan.innerHTML = `<span class="glitch-text" data-text="${text}">${text}</span>`;
        }
        const glitchEl = card.querySelector('.glitch-text');
        const startGlitch = () => { if (glitchEl) glitchEl.classList.add('active'); };
        const stopGlitch = () => { if (glitchEl) glitchEl.classList.remove('active'); };
        card.addEventListener('mouseenter', startGlitch);
        card.addEventListener('mouseleave', stopGlitch);
        card.addEventListener('touchstart', startGlitch, { passive: true });
        card.addEventListener('touchend', stopGlitch);
        card.addEventListener('touchcancel', stopGlitch);
    });