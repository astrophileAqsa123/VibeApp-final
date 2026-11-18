import 'package:flutter/material.dart';

const String cur = r'$';

String money(double v) => cur + v.toStringAsFixed(2);

String fmtDate(DateTime d) => d.day.toString() + '/' + d.month.toString() + '/' + d.year.toString();

class Product {
  final int id;
  final String name;
  final String category;
  final double price;
  final double oldPrice;
  final double rating;
  final int reviews;
  final String description;
  final IconData icon;
  final Color color;

  const Product({
    required this.id,
    required this.name,
    required this.category,
    required this.price,
    required this.oldPrice,
    required this.rating,
    required this.reviews,
    required this.description,
    required this.icon,
    required this.color,
  });

  int get discountPercent => oldPrice > price ? (((oldPrice - price) / oldPrice) * 100).round() : 0;
}

class CartItem {
  final Product product;
  final int qty;

  CartItem(this.product, this.qty);
}

class Order {
  final String id;
  final List<CartItem> items;
  final double total;
  final DateTime date;
  final String address;
  final String payment;
  String status;

  Order({
    required this.id,
    required this.items,
    required this.total,
    required this.date,
    required this.address,
    required this.payment,
    this.status = 'Processing',
  });
}

final List<Product> products = [
  const Product(
    id: 1,
    name: 'Wireless Headphones',
    category: 'Electronics',
    price: 79.99,
    oldPrice: 109.99,
    rating: 4.5,
    reviews: 328,
    description: 'Over-ear Bluetooth headphones with active noise cancellation, deep bass and 30 hours of battery life.',
    icon: Icons.headphones,
    color: Color(0xFF5C6BC0),
  ),
  const Product(
    id: 2,
    name: 'Smart Watch',
    category: 'Electronics',
    price: 129.00,
    oldPrice: 159.00,
    rating: 4.3,
    reviews: 210,
    description: 'Track your fitness, heart rate and sleep. Water resistant with a bright AMOLED display.',
    icon: Icons.watch,
    color: Color(0xFF26A69A),
  ),
  const Product(
    id: 3,
    name: 'Laptop Stand',
    category: 'Electronics',
    price: 34.50,
    oldPrice: 34.50,
    rating: 4.1,
    reviews: 96,
    description: 'Adjustable aluminium laptop stand that improves posture and airflow.',
    icon: Icons.laptop_mac,
    color: Color(0xFF78909C),
  ),
  const Product(
    id: 4,
    name: 'Running Shoes',
    category: 'Fashion',
    price: 64.90,
    oldPrice: 89.90,
    rating: 4.6,
    reviews: 512,
    description: 'Lightweight breathable running shoes with cushioned sole for all-day comfort.',
    icon: Icons.directions_run,
    color: Color(0xFFEF5350),
  ),
  const Product(
    id: 5,
    name: 'Denim Jacket',
    category: 'Fashion',
    price: 58.00,
    oldPrice: 75.00,
    rating: 4.2,
    reviews: 143,
    description: 'Classic fit denim jacket made from durable stretch cotton. A wardrobe essential.',
    icon: Icons.checkroom,
    color: Color(0xFF42A5F5),
  ),
  const Product(
    id: 6,
    name: 'Leather Backpack',
    category: 'Fashion',
    price: 89.00,
    oldPrice: 120.00,
    rating: 4.7,
    reviews: 267,
    description: 'Spacious leather backpack with padded laptop compartment and multiple pockets.',
    icon: Icons.backpack,
    color: Color(0xFF8D6E63),
  ),
  const Product(
    id: 7,
    name: 'Coffee Maker',
    category: 'Home',
    price: 49.99,
    oldPrice: 69.99,
    rating: 4.4,
    reviews: 389,
    description: 'Programmable coffee maker brewing up to 12 cups with a reusable filter.',
    icon: Icons.coffee_maker,
    color: Color(0xFF6D4C41),
  ),
  const Product(
    id: 8,
    name: 'Table Lamp',
    category: 'Home',
    price: 24.99,
    oldPrice: 24.99,
    rating: 4.0,
    reviews: 74,
    description: 'Modern LED desk lamp with three brightness levels and touch control.',
    icon: Icons.lightbulb,
    color: Color(0xFFFFB300),
  ),
  const Product(
    id: 9,
    name: 'Comfy Sofa Cushion',
    category: 'Home',
    price: 19.50,
    oldPrice: 26.00,
    rating: 4.3,
    reviews: 121,
    description: 'Soft velvet cushion with removable washable cover.',
    icon: Icons.weekend,
    color: Color(0xFFAB47BC),
  ),
  const Product(
    id: 10,
    name: 'Yoga Mat',
    category: 'Sports',
    price: 22.00,
    oldPrice: 30.00,
    rating: 4.5,
    reviews: 205,
    description: 'Non-slip eco-friendly yoga mat, 6mm thick, with carrying strap.',
    icon: Icons.self_improvement,
    color: Color(0xFF66BB6A),
  ),
  const Product(
    id: 11,
    name: 'Dumbbell Set',
    category: 'Sports',
    price: 95.00,
    oldPrice: 120.00,
    rating: 4.6,
    reviews: 158,
    description: 'Adjustable dumbbell set ranging from 2kg to 20kg for home workouts.',
    icon: Icons.fitness_center,
    color: Color(0xFF455A64),
  ),
  const Product(
    id: 12,
    name: 'Water Bottle',
    category: 'Sports',
    price: 14.99,
    oldPrice: 14.99,
    rating: 4.4,
    reviews: 432,
    description: 'Insulated stainless steel bottle keeps drinks cold for 24 hours or hot for 12.',
    icon: Icons.water_drop,
    color: Color(0xFF29B6F6),
  ),
];

const List<String> categories = ['All', 'Electronics', 'Fashion', 'Home', 'Sports'];

Product productById(int id) => products.firstWhere((p) => p.id == id);

class AppState extends ChangeNotifier {
  final Map<int, int> cart = {};
  final Set<int> wishlist = {};
  final List<Order> orders = [];
  int tab = 0;
  String? coupon;

  void setTab(int i) {
    tab = i;
    notifyListeners();
  }

  void addToCart(Product p, [int q = 1]) {
    cart[p.id] = (cart[p.id] ?? 0) + q;
    notifyListeners();
  }

  void setQty(int id, int q) {
    if (q <= 0) {
      cart.remove(id);
    } else {
      cart[id] = q;
    }
    if (cart.isEmpty) coupon = null;
    notifyListeners();
  }

  void toggleWish(int id) {
    if (wishlist.contains(id)) {
      wishlist.remove(id);
    } else {
      wishlist.add(id);
    }
    notifyListeners();
  }

  bool isWished(int id) => wishlist.contains(id);

  int get cartCount => cart.values.fold(0, (a, b) => a + b);

  double get subtotal {
    double s = 0;
    cart.forEach((id, q) {
      s += productById(id).price * q;
    });
    return s;
  }

  double get discount => coupon == 'SAVE10' ? subtotal * 0.10 : 0;

  double get shipping => (subtotal == 0 || subtotal - discount >= 100) ? 0 : 9.99;

  double get tax => (subtotal - discount) * 0.08;

  double get total => subtotal - discount + shipping + tax;

  bool applyCoupon(String code) {
    if (code.trim().toUpperCase() == 'SAVE10' && cart.isNotEmpty) {
      coupon = 'SAVE10';
      notifyListeners();
      return true;
    }
    return false;
  }

  void removeCoupon() {
    coupon = null;
    notifyListeners();
  }

  Order placeOrder(String address, String payment) {
    final items = cart.entries.map((e) => CartItem(productById(e.key), e.value)).toList();
    final order = Order(
      id: 'ORD' + (1001 + orders.length).toString(),
      items: items,
      total: total,
      date: DateTime.now(),
      address: address,
      payment: payment,
    );
    orders.insert(0, order);
    cart.clear();
    coupon = null;
    notifyListeners();
    return order;
  }

  void cancelOrder(Order o) {
    o.status = 'Cancelled';
    notifyListeners();
  }
}

class AppScope extends InheritedNotifier<AppState> {
  const AppScope({super.key, required AppState state, required super.child}) : super(notifier: state);

  static AppState of(BuildContext context) {
    return context.dependOnInheritedWidgetOfExactType<AppScope>()!.notifier!;
  }
}

void showMsg(BuildContext context, String text) {
  final m = ScaffoldMessenger.of(context);
  m.hideCurrentSnackBar();
  m.showSnackBar(SnackBar(content: Text(text), duration: const Duration(seconds: 2)));
}

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  FlutterError.onError = (FlutterErrorDetails details) {
    if (details.exceptionAsString().contains('RenderFlex overflowed') || details.exceptionAsString().contains('overflowed by')) {
      debugPrint('Layout overflow auto-handled: ${details.exceptionAsString()}');
      return;
    }
    FlutterError.presentError(details);
  };
  final state = AppState();
  runApp(AppScope(state: state, child: const ShopApp()));
}

class ShopApp extends StatelessWidget {
  const ShopApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'VibeShop',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.indigo),
        scaffoldBackgroundColor: const Color(0xFFF6F7FB),
      ),
      home: const HomeShell(),
    );
  }
}

class HomeShell extends StatelessWidget {
  const HomeShell({super.key});

  @override
  Widget build(BuildContext context) {
    final state = AppScope.of(context);
    final titles = ['VibeShop', 'My Wishlist', 'My Cart', 'My Orders'];
    final pages = <Widget>[
      const ShopPage(),
      const WishlistPage(),
      const CartPage(),
      const OrdersPage(),
    ];
    return Scaffold(
      resizeToAvoidBottomInset: true,
      appBar: AppBar(
        title: Text(titles[state.tab], style: const TextStyle(fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            tooltip: 'Cart',
            onPressed: () => state.setTab(2),
            icon: Badge(
              label: Text(state.cartCount.toString()),
              isLabelVisible: state.cartCount > 0,
              child: const Icon(Icons.shopping_cart_outlined),
            ),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: pages[state.tab],
      bottomNavigationBar: NavigationBar(
        selectedIndex: state.tab,
        onDestinationSelected: state.setTab,
        destinations: [
          const NavigationDestination(icon: Icon(Icons.storefront_outlined), selectedIcon: Icon(Icons.storefront), label: 'Shop'),
          NavigationDestination(
            icon: Badge(
              label: Text(state.wishlist.length.toString()),
              isLabelVisible: state.wishlist.isNotEmpty,
              child: const Icon(Icons.favorite_border),
            ),
            selectedIcon: const Icon(Icons.favorite),
            label: 'Wishlist',
          ),
          NavigationDestination(
            icon: Badge(
              label: Text(state.cartCount.toString()),
              isLabelVisible: state.cartCount > 0,
              child: const Icon(Icons.shopping_cart_outlined),
            ),
            selectedIcon: const Icon(Icons.shopping_cart),
            label: 'Cart',
          ),
          const NavigationDestination(icon: Icon(Icons.receipt_long_outlined), selectedIcon: Icon(Icons.receipt_long), label: 'Orders'),
        ],
      ),
    );
  }
}

class ShopPage extends StatefulWidget {
  const ShopPage({super.key});

  @override
  State<ShopPage> createState() => _ShopPageState();
}

class _ShopPageState extends State<ShopPage> {
  String query = '';
  String category = 'All';
  String sort = 'Popular';

  List<Product> get filtered {
    var list = products.where((p) {
      final matchCat = category == 'All' || p.category == category;
      final matchQuery = query.isEmpty || p.name.toLowerCase().contains(query.toLowerCase());
      return matchCat && matchQuery;
    }).toList();
    if (sort == 'Price: Low to High') {
      list.sort((a, b) => a.price.compareTo(b.price));
    } else if (sort == 'Price: High to Low') {
      list.sort((a, b) => b.price.compareTo(a.price));
    } else if (sort == 'Top Rated') {
      list.sort((a, b) => b.rating.compareTo(a.rating));
    }
    return list;
  }

  @override
  Widget build(BuildContext context) {
    final list = filtered;
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(12, 8, 12, 4),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  onChanged: (v) => setState(() => query = v),
                  decoration: InputDecoration(
                    hintText: 'Search products',
                    prefixIcon: const Icon(Icons.search),
                    filled: true,
                    fillColor: Colors.white,
                    contentPadding: const EdgeInsets.symmetric(vertical: 0),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(28), borderSide: BorderSide.none),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              PopupMenuButton<String>(
                tooltip: 'Sort',
                icon: const Icon(Icons.sort),
                onSelected: (v) => setState(() => sort = v),
                itemBuilder: (c) => ['Popular', 'Price: Low to High', 'Price: High to Low', 'Top Rated']
                    .map((s) => CheckedPopupMenuItem<String>(value: s, checked: s == sort, child: Text(s)))
                    .toList(),
              ),
            ],
          ),
        ),
        SizedBox(
          height: 48,
          child: ListView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            children: categories
                .map((c) => Padding(
                      padding: const EdgeInsets.only(right: 8, top: 6, bottom: 6),
                      child: ChoiceChip(
                        label: Text(c),
                        selected: category == c,
                        onSelected: (_) => setState(() => category = c),
                      ),
                    ))
                .toList(),
          ),
        ),
        Expanded(
          child: list.isEmpty
              ? const Center(child: Text('No products found'))
              : GridView.builder(
                  padding: const EdgeInsets.all(12),
                  gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                    maxCrossAxisExtent: 230,
                    childAspectRatio: 0.66,
                    crossAxisSpacing: 12,
                    mainAxisSpacing: 12,
                  ),
                  itemCount: list.length,
                  itemBuilder: (context, i) => ProductCard(product: list[i]),
                ),
        ),
      ],
    );
  }
}

class ProductArt extends StatelessWidget {
  final Product product;
  final double size;

  const ProductArt({super.key, required this.product, this.size = 64});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [product.color.withOpacity(0.25), product.color.withOpacity(0.6)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Center(child: Icon(product.icon, size: size, color: Colors.white)),
    );
  }
}

class ProductCard extends StatelessWidget {
  final Product product;

  const ProductCard({super.key, required this.product});

  @override
  Widget build(BuildContext context) {
    final state = AppScope.of(context);
    final wished = state.isWished(product.id);
    return Card(
      clipBehavior: Clip.antiAlias,
      elevation: 1,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: InkWell(
        onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => ProductDetailPage(product: product))),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Stack(
                children: [
                  Positioned.fill(child: ProductArt(product: product)),
                  if (product.discountPercent > 0)
                    Positioned(
                      left: 8,
                      top: 8,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(color: Colors.redAccent, borderRadius: BorderRadius.circular(8)),
                        child: Text('-' + product.discountPercent.toString() + '%',
                            style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                      ),
                    ),
                  Positioned(
                    right: 2,
                    top: 2,
                    child: IconButton(
                      visualDensity: VisualDensity.compact,
                      onPressed: () {
                        state.toggleWish(product.id);
                        showMsg(context, wished ? 'Removed from wishlist' : 'Added to wishlist');
                      },
                      icon: Icon(wished ? Icons.favorite : Icons.favorite_border, color: wished ? Colors.red : Colors.white),
                    ),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(10, 8, 10, 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(product.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w600)),
                  const SizedBox(height: 2),
                  Row(
                    children: [
                      const Icon(Icons.star, size: 14, color: Colors.amber),
                      const SizedBox(width: 2),
                      Text(product.rating.toString() + ' (' + product.reviews.toString() + ')', style: const TextStyle(fontSize: 11)),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(money(product.price), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                            if (product.oldPrice > product.price)
                              Text(money(product.oldPrice),
                                  style: const TextStyle(fontSize: 11, color: Colors.grey, decoration: TextDecoration.lineThrough)),
                          ],
                        ),
                      ),
                      IconButton.filled(
                        visualDensity: VisualDensity.compact,
                        tooltip: 'Add to cart',
                        onPressed: () {
                          state.addToCart(product);
                          showMsg(context, product.name + ' added to cart');
                        },
                        icon: const Icon(Icons.add_shopping_cart, size: 18),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class ProductDetailPage extends StatefulWidget {
  final Product product;

  const ProductDetailPage({super.key, required this.product});

  @override
  State<ProductDetailPage> createState() => _ProductDetailPageState();
}

class _ProductDetailPageState extends State<ProductDetailPage> {
  int qty = 1;

  @override
  Widget build(BuildContext context) {
    final state = AppScope.of(context);
    final p = widget.product;
    final wished = state.isWished(p.id);
    final related = products.where((x) => x.category == p.category && x.id != p.id).toList();
    return Scaffold(
      resizeToAvoidBottomInset: true,
      appBar: AppBar(
        title: Text(p.name),
        actions: [
          IconButton(
            onPressed: () {
              state.toggleWish(p.id);
              showMsg(context, wished ? 'Removed from wishlist' : 'Added to wishlist');
            },
            icon: Icon(wished ? Icons.favorite : Icons.favorite_border, color: wished ? Colors.red : null),
          ),
          IconButton(
            onPressed: () {
              state.setTab(2);
              Navigator.of(context).popUntil((r) => r.isFirst);
            },
            icon: Badge(
              label: Text(state.cartCount.toString()),
              isLabelVisible: state.cartCount > 0,
              child: const Icon(Icons.shopping_cart_outlined),
            ),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: ListView(
        children: [
          SizedBox(height: 260, child: ProductArt(product: p, size: 120)),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Chip(label: Text(p.category), visualDensity: VisualDensity.compact),
                const SizedBox(height: 6),
                Text(p.name, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
                const SizedBox(height: 6),
                Row(
                  children: [
                    ...List.generate(5, (i) => Icon(i < p.rating.round() ? Icons.star : Icons.star_border, color: Colors.amber, size: 20)),
                    const SizedBox(width: 8),
                    Text(p.rating.toString() + ' (' + p.reviews.toString() + ' reviews)'),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(money(p.price), style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Theme.of(context).colorScheme.primary)),
                    const SizedBox(width: 10),
                    if (p.oldPrice > p.price)
                      Text(money(p.oldPrice), style: const TextStyle(fontSize: 16, color: Colors.grey, decoration: TextDecoration.lineThrough)),
                    const SizedBox(width: 10),
                    if (p.discountPercent > 0)
                      Text(p.discountPercent.toString() + '% OFF', style: const TextStyle(color: Colors.green, fontWeight: FontWeight.bold)),
                  ],
                ),
                const SizedBox(height: 16),
                const Text('Description', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                const SizedBox(height: 4),
                Text(p.description, style: const TextStyle(height: 1.4)),
                const SizedBox(height: 16),
                Row(
                  children: [
                    const Text('Quantity', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                    const Spacer(),
                    IconButton.outlined(
                      onPressed: qty > 1 ? () => setState(() => qty--) : null,
                      icon: const Icon(Icons.remove),
                    ),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Text(qty.toString(), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                    ),
                    IconButton.outlined(
                      onPressed: qty < 10 ? () => setState(() => qty++) : null,
                      icon: const Icon(Icons.add),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                const Row(
                  children: [
                    Icon(Icons.local_shipping_outlined, size: 18, color: Colors.green),
                    SizedBox(width: 6),
                    Text('Free delivery on orders over \$100'),
                  ],
                ),
                const SizedBox(height: 20),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 14)),
                        onPressed: () {
                          state.addToCart(p, qty);
                          showMsg(context, 'Added ' + qty.toString() + ' x ' + p.name + ' to cart');
                        },
                        icon: const Icon(Icons.add_shopping_cart),
                        label: const Text('Add to Cart'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: FilledButton.icon(
                        style: FilledButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 14)),
                        onPressed: () {
                          state.addToCart(p, qty);
                          Navigator.of(context).push(MaterialPageRoute(builder: (_) => const CheckoutPage()));
                        },
                        icon: const Icon(Icons.flash_on),
                        label: const Text('Buy Now'),
                      ),
                    ),
                  ],
                ),
                if (related.isNotEmpty) ...[
                  const SizedBox(height: 24),
                  const Text('You may also like', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 8),
                  SizedBox(
                    height: 120,
                    child: ListView(
                      scrollDirection: Axis.horizontal,
                      children: related
                          .map((r) => GestureDetector(
                                onTap: () => Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => ProductDetailPage(product: r))),
                                child: Container(
                                  width: 120,
                                  margin: const EdgeInsets.only(right: 10),
                                  child: Card(
                                    clipBehavior: Clip.antiAlias,
                                    child: Column(
                                      children: [
                                        Expanded(child: ProductArt(product: r, size: 36)),
                                        Padding(
                                          padding: const EdgeInsets.all(6),
                                          child: Text(r.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12)),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ))
                          .toList(),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class WishlistPage extends StatelessWidget {
  const WishlistPage({super.key});

  @override
  Widget build(BuildContext context) {
    final state = AppScope.of(context);
    final list = products.where((p) => state.isWished(p.id)).toList();
    if (list.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.favorite_border, size: 72, color: Colors.grey),
            const SizedBox(height: 12),
            const Text('Your wishlist is empty', style: TextStyle(fontSize: 18)),
            const SizedBox(height: 12),
            FilledButton(onPressed: () => state.setTab(0), child: const Text('Browse products')),
          ],
        ),
      );
    }
    return ListView.builder(
      padding: const EdgeInsets.all(12),
      itemCount: list.length,
      itemBuilder: (context, i) {
        final p = list[i];
        return Card(
          clipBehavior: Clip.antiAlias,
          child: InkWell(
            onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => ProductDetailPage(product: p))),
            child: Row(
              children: [
                SizedBox(width: 90, height: 90, child: ProductArt(product: p, size: 40)),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(p.name, style: const TextStyle(fontWeight: FontWeight.w600)),
                      const SizedBox(height: 4),
                      Text(money(p.price), style: const TextStyle(fontWeight: FontWeight.bold)),
                    ],
                  ),
                ),
                Column(
                  children: [
                    IconButton(
                      tooltip: 'Add to cart',
                      onPressed: () {
                        state.addToCart(p);
                        showMsg(context, p.name + ' added to cart');
                      },
                      icon: const Icon(Icons.add_shopping_cart),
                    ),
                    IconButton(
                      tooltip: 'Remove',
                      onPressed: () => state.toggleWish(p.id),
                      icon: const Icon(Icons.favorite, color: Colors.red),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class CartPage extends StatefulWidget {
  const CartPage({super.key});

  @override
  State<CartPage> createState() => _CartPageState();
}

class _CartPageState extends State<CartPage> {
  final TextEditingController couponCtrl = TextEditingController();

  @override
  void dispose() {
    couponCtrl.dispose();
    super.dispose();
  }

  Widget summaryRow(String label, String value, {bool bold = false, Color? color}) {
    final style = TextStyle(fontWeight: bold ? FontWeight.bold : FontWeight.normal, fontSize: bold ? 18 : 14, color: color);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        children: [
          Text(label, style: style),
          const Spacer(),
          Text(value, style: style),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final state = AppScope.of(context);
    if (state.cart.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.shopping_cart_outlined, size: 72, color: Colors.grey),
            const SizedBox(height: 12),
            const Text('Your cart is empty', style: TextStyle(fontSize: 18)),
            const SizedBox(height: 12),
            FilledButton(onPressed: () => state.setTab(0), child: const Text('Start shopping')),
          ],
        ),
      );
    }
    final entries = state.cart.entries.toList();
    return Column(
      children: [
        Expanded(
          child: ListView(
            padding: const EdgeInsets.all(12),
            children: [
              ...entries.map((e) {
                final p = productById(e.key);
                final q = e.value;
                return Dismissible(
                  key: ValueKey('cart' + p.id.toString()),
                  direction: DismissDirection.endToStart,
                  background: Container(
                    alignment: Alignment.centerRight,
                    padding: const EdgeInsets.only(right: 20),
                    color: Colors.red,
                    child: const Icon(Icons.delete, color: Colors.white),
                  ),
                  onDismissed: (_) => state.setQty(p.id, 0),
                  child: Card(
                    clipBehavior: Clip.antiAlias,
                    child: Row(
                      children: [
                        SizedBox(width: 90, height: 100, child: ProductArt(product: p, size: 40)),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Padding(
                            padding: const EdgeInsets.symmetric(vertical: 8),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(p.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w600)),
                                Text(money(p.price) + ' each', style: const TextStyle(color: Colors.grey, fontSize: 12)),
                                const SizedBox(height: 6),
                                Row(
                                  children: [
                                    IconButton.outlined(
                                      visualDensity: VisualDensity.compact,
                                      onPressed: () => state.setQty(p.id, q - 1),
                                      icon: const Icon(Icons.remove, size: 16),
                                    ),
                                    Padding(
                                      padding: const EdgeInsets.symmetric(horizontal: 10),
                                      child: Text(q.toString(), style: const TextStyle(fontWeight: FontWeight.bold)),
                                    ),
                                    IconButton.outlined(
                                      visualDensity: VisualDensity.compact,
                                      onPressed: q < 10 ? () => state.setQty(p.id, q + 1) : null,
                                      icon: const Icon(Icons.add, size: 16),
                                    ),
                                    const Spacer(),
                                    Text(money(p.price * q), style: const TextStyle(fontWeight: FontWeight.bold)),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ),
                        IconButton(
                          tooltip: 'Remove',
                          onPressed: () => state.setQty(p.id, 0),
                          icon: const Icon(Icons.delete_outline),
                        ),
                      ],
                    ),
                  ),
                );
              }),
              const SizedBox(height: 8),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: state.coupon != null
                      ? Row(
                          children: [
                            const Icon(Icons.local_offer, color: Colors.green),
                            const SizedBox(width: 8),
                            Expanded(child: Text('Coupon ' + state.coupon! + ' applied (10% off)')),
                            TextButton(onPressed: state.removeCoupon, child: const Text('Remove')),
                          ],
                        )
                      : Row(
                          children: [
                            Expanded(
                              child: TextField(
                                controller: couponCtrl,
                                decoration: const InputDecoration(
                                  hintText: 'Coupon code (try SAVE10)',
                                  isDense: true,
                                  border: OutlineInputBorder(),
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            FilledButton(
                              onPressed: () {
                                final ok = state.applyCoupon(couponCtrl.text);
                                showMsg(context, ok ? 'Coupon applied' : 'Invalid coupon code');
                                if (ok) couponCtrl.clear();
                              },
                              child: const Text('Apply'),
                            ),
                          ],
                        ),
                ),
              ),
            ],
          ),
        ),
        Container(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
          decoration: const BoxDecoration(
            color: Colors.white,
            boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 8)],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              summaryRow('Subtotal (' + state.cartCount.toString() + ' items)', money(state.subtotal)),
              if (state.discount > 0) summaryRow('Discount', '-' + money(state.discount), color: Colors.green),
              summaryRow('Shipping', state.shipping == 0 ? 'FREE' : money(state.shipping)),
              summaryRow('Tax (8%)', money(state.tax)),
              const Divider(),
              summaryRow('Total', money(state.total), bold: true),
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  style: FilledButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 14)),
                  onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const CheckoutPage())),
                  icon: const Icon(Icons.lock_outline),
                  label: const Text('Proceed to Checkout'),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class CheckoutPage extends StatefulWidget {
  const CheckoutPage({super.key});

  @override
  State<CheckoutPage> createState() => _CheckoutPageState();
}

class _CheckoutPageState extends State<CheckoutPage> {
  final formKey = GlobalKey<FormState>();
  final nameCtrl = TextEditingController();
  final phoneCtrl = TextEditingController();
  final addressCtrl = TextEditingController();
  final cityCtrl = TextEditingController();
  final zipCtrl = TextEditingController();
  String payment = 'Credit/Debit Card';

  @override
  void dispose() {
    nameCtrl.dispose();
    phoneCtrl.dispose();
    addressCtrl.dispose();
    cityCtrl.dispose();
    zipCtrl.dispose();
    super.dispose();
  }

  String? requiredField(String? v) => (v == null || v.trim().isEmpty) ? 'Required' : null;

  Widget field(String label, TextEditingController c, {TextInputType? type, String? Function(String?)? validator}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: TextFormField(
        controller: c,
        keyboardType: type,
        validator: validator ?? requiredField,
        decoration: InputDecoration(labelText: label, border: const OutlineInputBorder(), filled: true, fillColor: Colors.white),
      ),
    );
  }

  void placeOrder(AppState state) {
    if (!formKey.currentState!.validate()) return;
    final address = nameCtrl.text.trim() +
        ', ' +
        addressCtrl.text.trim() +
        ', ' +
        cityCtrl.text.trim() +
        ' ' +
        zipCtrl.text.trim() +
        ' (Phone: ' +
        phoneCtrl.text.trim() +
        ')';
    final order = state.placeOrder(address, payment);
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => OrderSuccessPage(order: order)),
      (r) => r.isFirst,
    );
  }

  @override
  Widget build(BuildContext context) {
    final state = AppScope.of(context);
    final entries = state.cart.entries.toList();
    return Scaffold(
      resizeToAvoidBottomInset: true,
      appBar: AppBar(title: const Text('Checkout')),
      body: entries.isEmpty
          ? const Center(child: Text('Your cart is empty'))
          : Form(
              key: formKey,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  const Text('Shipping Address', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 12),
                  field('Full name', nameCtrl),
                  field('Phone', phoneCtrl,
                      type: TextInputType.phone,
                      validator: (v) => (v == null || v.trim().length < 7) ? 'Enter a valid phone number' : null),
                  field('Address', addressCtrl),
                  Row(
                    children: [
                      Expanded(child: field('City', cityCtrl)),
                      const SizedBox(width: 12),
                      Expanded(child: field('ZIP code', zipCtrl, type: TextInputType.number)),
                    ],
                  ),
                  const SizedBox(height: 4),
                  const Text('Payment Method', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    children: ['Credit/Debit Card', 'PayPal', 'Cash on Delivery']
                        .map((m) => ChoiceChip(
                              label: Text(m),
                              selected: payment == m,
                              onSelected: (_) => setState(() => payment = m),
                            ))
                        .toList(),
                  ),
                  const SizedBox(height: 20),
                  const Text('Order Summary', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Column(
                        children: [
                          ...entries.map((e) {
                            final p = productById(e.key);
                            return Padding(
                              padding: const EdgeInsets.symmetric(vertical: 3),
                              child: Row(
                                children: [
                                  Expanded(child: Text(p.name + ' x ' + e.value.toString(), overflow: TextOverflow.ellipsis)),
                                  Text(money(p.price * e.value)),
                                ],
                              ),
                            );
                          }),
                          const Divider(),
                          Row(children: [const Text('Subtotal'), const Spacer(), Text(money(state.subtotal))]),
                          if (state.discount > 0)
                            Row(children: [const Text('Discount'), const Spacer(), Text('-' + money(state.discount))]),
                          Row(children: [const Text('Shipping'), const Spacer(), Text(state.shipping == 0 ? 'FREE' : money(state.shipping))]),
                          Row(children: [const Text('Tax'), const Spacer(), Text(money(state.tax))]),
                          const Divider(),
                          Row(
                            children: [
                              const Text('Total', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
                              const Spacer(),
                              Text(money(state.total), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  FilledButton.icon(
                    style: FilledButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16)),
                    onPressed: () => placeOrder(state),
                    icon: const Icon(Icons.check_circle_outline),
                    label: Text('Place Order  -  ' + money(state.total)),
                  ),
                ],
              ),
            ),
    );
  }
}

class OrderSuccessPage extends StatelessWidget {
  final Order order;

  const OrderSuccessPage({super.key, required this.order});

  @override
  Widget build(BuildContext context) {
    final state = AppScope.of(context);
    return Scaffold(
      resizeToAvoidBottomInset: true,
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.check_circle, size: 96, color: Colors.green),
                const SizedBox(height: 16),
                const Text('Order Placed!', style: TextStyle(fontSize: 26, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                Text('Order ' + order.id, style: const TextStyle(fontSize: 16)),
                const SizedBox(height: 4),
                Text('Total paid: ' + money(order.total) + ' via ' + order.payment, textAlign: TextAlign.center),
                const SizedBox(height: 4),
                const Text('Thank you for shopping with us. Your items will be delivered soon.', textAlign: TextAlign.center),
                const SizedBox(height: 24),
                FilledButton(
                  onPressed: () {
                    state.setTab(3);
                    Navigator.of(context).popUntil((r) => r.isFirst);
                  },
                  child: const Text('View My Orders'),
                ),
                const SizedBox(height: 8),
                OutlinedButton(
                  onPressed: () {
                    state.setTab(0);
                    Navigator.of(context).popUntil((r) => r.isFirst);
                  },
                  child: const Text('Continue Shopping'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class OrdersPage extends StatelessWidget {
  const OrdersPage({super.key});

  Color statusColor(String s) {
    if (s == 'Cancelled') return Colors.red;
    if (s == 'Delivered') return Colors.green;
    return Colors.orange;
  }

  @override
  Widget build(BuildContext context) {
    final state = AppScope.of(context);
    if (state.orders.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.receipt_long_outlined, size: 72, color: Colors.grey),
            const SizedBox(height: 12),
            const Text('No orders yet', style: TextStyle(fontSize: 18)),
            const SizedBox(height: 12),
            FilledButton(onPressed: () => state.setTab(0), child: const Text('Shop now')),
          ],
        ),
      );
    }
    return ListView.builder(
      padding: const EdgeInsets.all(12),
      itemCount: state.orders.length,
      itemBuilder: (context, i) {
        final o = state.orders[i];
        return Card(
          child: ExpansionTile(
            shape: const Border(),
            title: Text(o.id + '  -  ' + money(o.total), style: const TextStyle(fontWeight: FontWeight.bold)),
            subtitle: Row(
              children: [
                Text(fmtDate(o.date)),
                const SizedBox(width: 10),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: statusColor(o.status).withOpacity(0.15),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(o.status, style: TextStyle(color: statusColor(o.status), fontSize: 12, fontWeight: FontWeight.w600)),
                ),
              ],
            ),
            childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
            expandedCrossAxisAlignment: CrossAxisAlignment.start,
            children: [
              ...o.items.map((it) => Padding(
                    padding: const EdgeInsets.symmetric(vertical: 3),
                    child: Row(
                      children: [
                        Icon(it.product.icon, size: 20, color: it.product.color),
                        const SizedBox(width: 8),
                        Expanded(child: Text(it.product.name + ' x ' + it.qty.toString())),
                        Text(money(it.product.price * it.qty)),
                      ],
                    ),
                  )),
              const Divider(),
              Text('Ship to: ' + o.address, style: const TextStyle(fontSize: 12)),
              const SizedBox(height: 4),
              Text('Payment: ' + o.payment, style: const TextStyle(fontSize: 12)),
              if (o.status == 'Processing')
                Align(
                  alignment: Alignment.centerRight,
                  child: TextButton.icon(
                    onPressed: () {
                      state.cancelOrder(o);
                      showMsg(context, 'Order ' + o.id + ' cancelled');
                    },
                    icon: const Icon(Icons.cancel_outlined, color: Colors.red),
                    label: const Text('Cancel Order', style: TextStyle(color: Colors.red)),
                  ),
                ),
            ],
          ),
        );
      },
    );
  }
}