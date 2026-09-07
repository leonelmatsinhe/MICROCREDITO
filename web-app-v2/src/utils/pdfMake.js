export async function getPdfMake() {
  const module = await import('pdfmake/build/pdfmake')
  const fontsModule = await import('pdfmake/build/vfs_fonts')
  const pdfMake = module.default || module
  const fonts = fontsModule.default || fontsModule

  if (pdfMake.virtualfs && fonts) {
    pdfMake.virtualfs.storage = fonts
  }

  if (pdfMake.vfs === undefined && fonts) {
    pdfMake.vfs = fonts
  }

  if (typeof pdfMake.createPdf !== 'function') {
    throw new Error('pdfmake não foi inicializado corretamente')
  }

  return pdfMake
}
