import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'screens/home.dart';
import 'screens/request.dart';
import 'screens/reg.dart';
import 'widgets/waiting_for_approval.dart';
import 'widgets/notif.dart';
import 'widgets/pop.dart';
import 'widgets/archived_account.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();
  runApp(const ResqnectApp());
}

class ResqnectApp extends StatefulWidget {
  const ResqnectApp({super.key});

  @override
  _ResqnectAppState createState() => _ResqnectAppState();
}

class _ResqnectAppState extends State<ResqnectApp> {
  @override
  void initState() {
    super.initState();
    // Call checkUserStatus after splash screen has shown
    Future.delayed(const Duration(seconds: 2), () async {
      await checkUserStatus(context);
    });
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'RESQNECT',
      theme: ThemeData(
        primaryColor: Colors.blue,
        fontFamily: 'Poppins',
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(minimumSize: const Size(100, 40)),
        ),
      ),
      initialRoute: '/splash',
      routes: {
        '/splash': (context) => const SplashScreen(),
        '/request': (context) {
          final args = ModalRoute.of(context)!.settings.arguments as Map<String, dynamic>;

          if(args == null) {
            return const ErrorScreen();
          }

          return Assistance(
            fullName: args['fullName'],
            contact: args['contact'],
            gender: args['gender'],
            address: args['fullAddress'],
            age: args['age'],
            barangay: args['barangay'],
            profileUrl: args['profileUrl'],
            emergencyContactName: args['emergencyContactName'],
            emergencyContactNumber: args['emergencyContactNumber'],
          );
        },
        '/register': (context) => RegistrationScreen(),
        '/approval': (context) => const ApprovalNotification(),
        '/waiting_for_approval': (context) => const WaitingForApprovalScreen(),
      }, 
    );
  }

  Future<void> checkUserStatus(BuildContext context) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final userId = prefs.getString('residentUID');
      final userType = prefs.getString('userType');

      print('DEBUG: Starting status check');
      print('DEBUG: User ID: $userId');
      print('DEBUG: User Type: $userType');

      if (userId == null) {
        print('DEBUG: No user ID found, redirecting to register');
        if (context.mounted) {
          Navigator.pushReplacementNamed(context, '/register');
        }
        return;
      }

      final userDoc = await FirebaseFirestore.instance
          .collection('residents')
          .doc(userId)
          .get();

      if (!userDoc.exists) {
        print('DEBUG: User document not found');
        if (context.mounted) {
          Navigator.pushReplacementNamed(context, '/register');
        }
        return;
      }

      final userData = userDoc.data() as Map<String, dynamic>;
      final status = userData['status']?.toString().toLowerCase();
      final archiveReason = userData['archiveReason'] as String?;
      
      print('DEBUG: Current user status from Firestore: $status');
      print('DEBUG: Archive reason: $archiveReason');
      print('DEBUG: Full user data: $userData');
      
      // Store the current status in SharedPreferences
      await prefs.setString('status', status ?? 'pending');
      print('DEBUG: Stored status in SharedPreferences: ${status ?? 'pending'}');

      // Check archived status first
      if (status == 'archived') {
        print('DEBUG: User is archived, showing archived screen');
        if (context.mounted) {
          // Clear any existing navigation stack and show archived screen
          Navigator.of(context).pushAndRemoveUntil(
            MaterialPageRoute(
              builder: (context) => ArchivedAccountScreen(
                reason: archiveReason ?? 'No reason provided',
              ),
            ),
            (route) => false,
          );
        }
        return;
      }

      // Then check other statuses
      if (status == 'approved' || status == 'active') {
        print('DEBUG: User is approved/active, navigating to home');
        if (userType == 'resident') {
          if (context.mounted) {
            Navigator.pushReplacementNamed(context, '/home');
          }
        } else if (userType == 'barangay') {
          if (context.mounted) {
            Navigator.pushReplacementNamed(context, '/brgy-home');
          }
        } else if (userType == 'admin') {
          if (context.mounted) {
            Navigator.pushReplacementNamed(context, '/admin-home');
          }
        }
      } else if (status == 'pending') {
        print('DEBUG: User is pending, showing waiting screen');
        if (context.mounted) {
          Navigator.pushReplacementNamed(context, '/waiting_for_approval');
        }
      } else {
        print('DEBUG: Unknown status: $status, redirecting to register');
        if (context.mounted) {
          Navigator.pushReplacementNamed(context, '/register');
        }
      }
    } catch (e) {
      print('DEBUG: Error checking user status: $e');
      if (context.mounted) {
        Navigator.pushReplacementNamed(context, '/register');
      }
    }
  }
}

class ErrorScreen extends StatelessWidget {
  const ErrorScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Text('Error: Something went wrong!'),
      ),
    );
  }
}

class HomeScreen extends StatelessWidget {
  const HomeScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Home Screen')),
      body: Center(child: Text('Welcome to Home!')),
    );
  }
}

class CustomTextField extends StatelessWidget {
  final String label;
  final TextEditingController controller;

  const CustomTextField({Key? key, required this.label, required this.controller}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      decoration: InputDecoration(
        labelText: label,
        border: OutlineInputBorder(),
      ),
    );
  }
}
