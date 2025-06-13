import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../screens/request.dart';

class ApprovalNotification extends StatelessWidget {
  const ApprovalNotification({super.key});

  @override
  Widget build(BuildContext context) {
    return WillPopScope(
      onWillPop: () async => false,
      child: Scaffold(
        backgroundColor: Colors.transparent,
        body: Stack(
          children: [
            // This will keep the previous screen visible
            Positioned.fill(
              child: Container(
                color: Colors.black.withOpacity(0.5),
              ),
            ),
            // Center the dialog
            Center(
              child: Dialog(
                backgroundColor: Colors.transparent,
                elevation: 0,
                child: Container(
                  padding: const EdgeInsets.all(24.0),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20.0),
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Image.asset(
                        'logo (1).png',
                        width: 80,
                        height: 80,
                      ),
                      const SizedBox(height: 16),
                      const Text(
                        'YOUR REGISTRATION HAS BEEN APPROVED!',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF333333),
                        ),
                      ),
                      const SizedBox(height: 24),
                      ElevatedButton(
                        onPressed: () async {
                          final prefs = await SharedPreferences.getInstance();
                          String? residentUID = prefs.getString('residentUID');

                          if(residentUID != null) {
                            final residentRef = FirebaseFirestore.instance.collection('residents').doc(residentUID);
                            await residentRef.update({'status': 'active'});
                            await prefs.setString('status', 'active');

                            final docSnapShot = await residentRef.get();
                            if (docSnapShot.exists) {
                              final residentData = docSnapShot.data()!;
                              final fullName = residentData['fullName'] as String;
                              final contact = residentData['contact'] as String;
                              final gender = residentData['gender'] as String;
                              final address = residentData['fullAddress'] as String;
                              final age = residentData['age'].toString();
                              final barangay = residentData['barangay'] as String;
                              final profileUrl = residentData['profilePhotoUrl'] as String;
                              final emergencyContactName = residentData['emergencyContactName'] as String;
                              final emergencyContactNumber = residentData['emergencyContactNumber'] as String;

                              if (context.mounted) {
                                Navigator.pushAndRemoveUntil(
                                  context,
                                  MaterialPageRoute(
                                    builder: (context) => Assistance(
                                      fullName: fullName,
                                      contact: contact,
                                      gender: gender,
                                      address: address,
                                      age: age,
                                      barangay: barangay,
                                      profileUrl: profileUrl,
                                      emergencyContactName: emergencyContactName,
                                      emergencyContactNumber: emergencyContactNumber,
                                    ),
                                  ),
                                  (route) => false,
                                );
                              }
                            }
                          }
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF1848A0),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          elevation: 0,
                        ),
                        child: const Text(
                          'CONTINUE',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}