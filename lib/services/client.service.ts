import { ClientsRepository } from '@/lib/repositories/clients'
import { UserContext } from '@/lib/middleware/auth'
import type { CreateClientInput, UpdateClientInput } from '@/lib/repositories/clients'

export class ClientService {
  private clientsRepo: ClientsRepository

  constructor(userContext: UserContext) {
    this.clientsRepo = new ClientsRepository(userContext)
  }

  /**
   * Create a new client
   */
  async createClient(input: CreateClientInput) {
    return this.clientsRepo.createClient(input)
  }

  /**
   * Update client
   */
  async updateClient(clientId: string, input: UpdateClientInput) {
    return this.clientsRepo.updateClient(clientId, input)
  }

  /**
   * Archive client (soft delete)
   */
  async archiveClient(clientId: string) {
    return this.clientsRepo.archiveClient(clientId)
  }

  /**
   * Get client with projects
   */
  async getClientWithProjects(clientId: string) {
    return this.clientsRepo.getClientWithProjects(clientId)
  }

  /**
   * Get client statistics
   */
  async getClientStats(clientId: string) {
    return this.clientsRepo.getClientStats(clientId)
  }

  /**
   * Get all clients
   */
  async getClients(status?: 'active' | 'archived') {
    return this.clientsRepo.getClients(status)
  }

  /**
   * Get client by ID
   */
  async getClientById(clientId: string) {
    return this.clientsRepo.getClientById(clientId)
  }

  /**
   * Get client branding from settings
   */
  async getClientBranding(clientId: string) {
    const client = await this.clientsRepo.getClientById(clientId)
    if (!client) {
      return null
    }

    const settings = (client.settings as Record<string, any>) || {}
    return {
      logoUrl: client.logoUrl || settings.logoUrl,
      primaryColor: settings.primaryColor || '#6366f1',
      secondaryColor: settings.secondaryColor || '#8b5cf6',
      textColor: settings.textColor || '#1f2937',
    }
  }
}

