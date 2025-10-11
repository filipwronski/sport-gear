/**
 * Ultra minimal ServiceRecordService for testing
 */
export class ServiceRecordService {
  async getServicesByBikeId(userId: string, bikeId: string, params: any) {
    // Mock response without database call
    return {
      services: [],
      total: 0,
      has_more: false
    };
  }
}
