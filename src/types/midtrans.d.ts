declare module 'midtrans-client' {
  export class Snap {
    constructor(options: {
      isProduction: boolean
      serverKey: string
      clientKey: string
    })
    createTransaction(parameter: Record<string, unknown>): Promise<{
      token: string
      redirect_url: string
    }>
  }
}
