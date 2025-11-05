/**
 * Ultra minimal ServiceRecordService for testing
 */
export class ServiceRecordService {
  async getServicesByBikeId(_userId: string, _bikeId: string, _params: any) {
    // Mock response without database call
    return {
      services: [],
      total: 0,
      has_more: false,
    };
  }
}
