import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:resqnect/screens/request.dart';
import 'package:resqnect/widgets/notif.dart';
import 'package:resqnect/widgets/waiting_for_approval.dart';
import 'package:resqnect/widgets/archived_account.dart';


class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _fadeAnimation;
  late Animation<Offset> _slideAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    );

    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: Curves.easeIn,
      ),
    );

    _slideAnimation = Tween<Offset>(
      begin: const Offset(0, 0.3),
      end: Offset.zero,
    ).animate(
      CurvedAnimation(
        parent: _controller,
        curve: Curves.easeOutCubic,
      ),
    );

    _controller.forward();
    navigateBasedOnStatus();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> navigateBasedOnStatus() async {
    await Future.delayed(const Duration(seconds: 2)); // splash delay
    final prefs = await SharedPreferences.getInstance();
    String? status = prefs.getString('status');
    String? residentUID = prefs.getString('residentUID');

    if (status == null || residentUID == null) {
      if (mounted) {
        Navigator.pushReplacementNamed(context, '/register');
      }
      return;
    }

    final docSnapShot = await FirebaseFirestore.instance
        .collection('residents')
        .doc(residentUID)
        .get();

    if (!docSnapShot.exists) {
      await prefs.clear();
      if (mounted) {
        Navigator.pushReplacementNamed(context, '/register');
      }
    } else {
      final status = docSnapShot.data()?['status']?.toString().toLowerCase();
      
      if (status == 'archived') {
        if (mounted) {
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(
              builder: (context) => ArchivedAccountScreen(
                reason: docSnapShot.data()?['archiveReason'] ?? 'No reason provided',
              ),
            ),
          );
        }
      } else if (status == 'approved') {
        if (mounted) {
          showDialog(
            context: context,
            barrierDismissible: false,
            barrierColor: Colors.transparent,
            builder: (context) => const ApprovalNotification(),
          );
        }
      } else if (status == 'active') {
        if (mounted) {
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(
              builder: (context) => Assistance(
                fullName: docSnapShot.data()?['fullName'] ?? '',
                contact: docSnapShot.data()?['contact'] ?? '',
                gender: docSnapShot.data()?['gender'] ?? '',
                address: docSnapShot.data()?['completeAddress'] ?? '',
                age: docSnapShot.data()?['age']?.toString() ?? '',
                barangay: docSnapShot.data()?['barangay'] ?? '',
                profileUrl: docSnapShot.data()?['profilePhotoUrl'] ?? '',
                emergencyContactName: docSnapShot.data()?['emergencyContactName'] ?? '',
                emergencyContactNumber: docSnapShot.data()?['emergencyContactNumber'] ?? '',
              ),
            ),
          );
        }
      } else {
        if (mounted) {
          showDialog(
            context: context,
            barrierDismissible: false,
            barrierColor: Colors.transparent,
            builder: (context) => const WaitingForApprovalScreen(),
          );
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              const Color(0xFF1848A0).withOpacity(0.95),
              const Color(0xFF38A2FF).withOpacity(0.95),
            ],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Logo with animation
                AnimatedBuilder(
                  animation: _controller,
                  builder: (context, child) {
                    return FadeTransition(
                      opacity: _fadeAnimation,
                      child: SlideTransition(
                        position: _slideAnimation,
                        child: Container(
                          padding: const EdgeInsets.all(20),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.1),
                            shape: BoxShape.circle,
                          ),
                          child: Image.asset(
                            'logo (1).png',
                            width: 120,
                            height: 120,
                          ),
                        ),
                      ),
                    );
                  },
                ),
                const SizedBox(height: 24),
                // Title with animation
                AnimatedBuilder(
                  animation: _controller,
                  builder: (context, child) {
                    return FadeTransition(
                      opacity: _fadeAnimation,
                      child: SlideTransition(
                        position: _slideAnimation,
                        child: const Text(
                          'RESQNECT',
                          style: TextStyle(
                            fontSize: 42,
                            fontWeight: FontWeight.w800,
                            color: Colors.white,
                            letterSpacing: 1.5,
                          ),
                        ),
                      ),
                    );
                  },
                ),
                const SizedBox(height: 12),
                // Subtitle with animation
                AnimatedBuilder(
                  animation: _controller,
                  builder: (context, child) {
                    return FadeTransition(
                      opacity: _fadeAnimation,
                      child: SlideTransition(
                        position: _slideAnimation,
                        child: const Text(
                          'Disaster Response Platform',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w500,
                            color: Colors.white70,
                            letterSpacing: 0.5,
                          ),
                        ),
                      ),
                    );
                  },
                ),
                const SizedBox(height: 48),
                // Loading indicator with animation
                AnimatedBuilder(
                  animation: _controller,
                  builder: (context, child) {
                    return FadeTransition(
                      opacity: _fadeAnimation,
                      child: Container(
                        width: 32,
                        height: 32,
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.15),
                          shape: BoxShape.circle,
                        ),
                        child: const Center(
                          child: SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                              valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                              strokeWidth: 2.5,
                            ),
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}