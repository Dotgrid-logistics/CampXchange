export type Category = "All" | "Fans" | "Electronics" | "Textbooks" | "Furniture" | "Clothing" | "Other";

export interface Item {
  id: string;
  title: string;
  price: number;
  description: string;
  category: Exclude<Category, "All">;
  campus: string;
  sellerName: string;
  sellerPhone: string;
  imageUrl: string;
  condition: 'Used' | 'New';
  exchangeLocation: string;
  customExchangeLocation?: string;
  listingPrice: number;
  userId: string;
  sellerType?: 'Individual' | 'Business';
  createdAt: any;
  isVerified: boolean;
  meetingTime?: string;
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  photoURL?: string;
  campus?: string;
  phone?: string;
  accountType: 'Individual' | 'Business';
  isVerified?: boolean;
}
