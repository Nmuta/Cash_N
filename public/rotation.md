Rotation is separate from geolocation. navigator.geolocation only reports latitude/longitude (and optionally speed/heading if the hardware provides it while moving). To react when the user rotates the phone in place you need motion/orientation sensors:
Compass / orientation: Use DeviceOrientationEvent or the newer AbsoluteOrientationSensor/Magnetometer. They expose yaw/pitch/roll based on the phone’s magnetometer and gyroscope.
Permissions: On iOS Safari and recent Chrome, motion sensors require both HTTPS and an explicit user permission prompt. In Safari you must call DeviceOrientationEvent.requestPermission(). Chrome prompts automatically after the first listener.
Sensor quirks: Indoors, compass readings can be noisy; calibrate when possible and smooth/average changes. Some devices only provide coarse webkitCompassHeading.
Sample browser logic (secure context):

[code]
    if (typeof DeviceOrientationEvent?.requestPermission === 'function') {
    await DeviceOrientationEvent.requestPermission(); // iOS
    }
    window.addEventListener('deviceorientation', (evt) => {
    const heading = evt.alpha;      // rotation around Z (0–360°)
    const pitch = evt.beta;
    const roll = evt.gamma;
    updatePlayerHeading(heading);
    });
[/code]
Combine that with geolocation: geolocation updates position; device orientation updates facing direction.