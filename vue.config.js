const { defineConfig } = require('@vue/cli-service')

module.exports = defineConfig({
  transpileDependencies: true,
  pages: {
    index: {
      entry: 'src/main.js', // 메인 진입점
      title: 'HD2 preset Manager', // 👈 여기에 네 프로그램 이름을 적어줘!
    },
  },
  pluginOptions: {
    productName: "HD Preset Manager",
    electronBuilder: {
      // 🚀 koffi를 외부 모듈로 설정하여 빌드 시 오류를 방지합니다.
      externals: ['koffi'],
      nodeIntegration: true,
      contextIsolation: false,
      builderOptions: {
        win: {
          icon: 'public/icon.ico'
        },
        nsis: {
          oneClick: false,
          allowToChangeInstallationDirectory: true,
          installerIcon: "public/icon.ico",
          uninstallerIcon: "public/icon.ico",
          uninstallDisplayName: "HD2 preset Manager"
        }
      }
    }
  }
})