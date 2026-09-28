const { withAppBuildGradle } = require('@expo/config-plugins');

module.exports = function withAndroidReleaseSigning(config) {
  return withAppBuildGradle(config, configWithGradle => {
    let contents = configWithGradle.modResults.contents;

    if (!/signingConfigs\s*\{/.test(contents)) {
      throw new Error('Generated Android Gradle file has no signingConfigs block.');
    }
    if (!/buildTypes\s*\{/.test(contents)) {
      throw new Error('Generated Android Gradle file has no buildTypes block.');
    }

    const releaseSigningConfig = `signingConfigs {
        release {
            storeFile file(System.getenv("ANDROID_KEYSTORE_PATH"))
            storePassword System.getenv("ANDROID_STORE_PASSWORD")
            keyAlias System.getenv("ANDROID_KEY_ALIAS")
            keyPassword System.getenv("ANDROID_KEY_PASSWORD")
        }`;
    contents = contents.replace(/signingConfigs\s*\{/, releaseSigningConfig);

    const releaseBuildTypePattern =
      /(buildTypes\s*\{[\s\S]*?\brelease\s*\{[\s\S]*?signingConfig\s+)signingConfigs\.debug/;
    if (!releaseBuildTypePattern.test(contents)) {
      throw new Error('Generated Android release build type has no debug signing config to replace.');
    }
    contents = contents.replace(releaseBuildTypePattern, '$1signingConfigs.release');
    configWithGradle.modResults.contents = contents;
    return configWithGradle;
  });
};