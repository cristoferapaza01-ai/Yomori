plugins {
    alias(mihonx.plugins.android.application)
}

android {
    namespace = "org.yomori.extension.all.mangadex"

    defaultConfig {
        applicationId = "org.yomori.extension.all.mangadex"
        versionCode = 15
        versionName = "1.5.0"
    }

    signingConfigs {
        create("yomori") {
            storeFile = file("$rootDir/../yomori-extensions/yomori-extension.keystore")
            storePassword = "yomoripass"
            keyAlias = "yomori"
            keyPassword = "yomoripass"
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName("yomori")
        }
        debug {
            signingConfig = signingConfigs.getByName("yomori")
        }
    }
}

dependencies {
    compileOnly(projects.sourceApi)
    compileOnly(projects.core.common)
    compileOnly(libs.bundles.okhttp)
    compileOnly(libs.jsoup)
    compileOnly(libs.rxJava)
    compileOnly(libs.kotlinx.serialization.json)
    compileOnly(libs.kotlinx.serialization.protobuf)
}
