pluginManagement {
    includeBuild("gradle/build-logic")
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
        maven(url = "https://www.jitpack.io")
    }
}

dependencyResolutionManagement {
    versionCatalogs {
        create("mihonx") {
            from(files("gradle/mihon.versions.toml"))
        }
    }

    @Suppress("UnstableApiUsage")
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)

    @Suppress("UnstableApiUsage")
    repositories {
        google()
        mavenCentral()
        maven(url = "https://www.jitpack.io")
    }
}

enableFeaturePreview("TYPESAFE_PROJECT_ACCESSORS")

rootProject.name = "Mihon"
include(":app")
include(":baseline-profile")
include(":core-metadata")
include(":core:archive")
include(":core:common")
include(":core:viewmodel")
include(":data")
include(":domain")
include(":i18n")
include(":presentation-core")
include(":presentation-widget")
include(":source-api")
include(":source-local")
include(":telemetry")

include(":ext-modules:es-olympusscanlation")
include(":ext-modules:es-zonatmo")
include(":ext-modules:all-mangadex")
include(":ext-modules:es-skymangas")
include(":ext-modules:es-ikigaimangas")
include(":ext-modules:es-miauscan")
include(":ext-modules:es-manhwalatino")
include(":ext-modules:es-plottwistnofansub")
include(":ext-modules:es-rnscanlation")
include(":ext-modules:es-tmohentai")
