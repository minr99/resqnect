import 'package:flutter/services.dart';
import 'package:flutter/material.dart';
import 'package:resqnect/screens/home.dart';
import '../widgets/notif.dart';
import 'package:resqnect/screens/request.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';
import 'dart:math';
import 'package:shared_preferences/shared_preferences.dart';
import '../widgets/waiting_for_approval.dart';

class RegistrationScreen extends StatefulWidget {
  const RegistrationScreen({super.key});

  @override
  State<RegistrationScreen> createState() => _RegistrationScreenState();
}

class _RegistrationScreenState extends State<RegistrationScreen> {
  final _formKey = GlobalKey<FormState>();
  bool agreeToShare = false;
  String? selectedGender;
  bool isLoading = false;

  // Form data variables
  String firstName = '';
  String middleName = '';
  String lastName = '';
  String dob = '';
  String contact = '';
  String barangay = '';
  String completeAddress = '';
  String emergencyContactName = '';
  String emergencyContactNumber = '';
  List<String> confirmedBarangays = [];
  bool isBarangayLoading = true;

  // Add a TextEditingController for the date of birth field
  final TextEditingController _dobController = TextEditingController();

  File? profilePhoto;
  String? profilePhotoUrl;

  final List<String> genders = ['Male', 'Female', 'Other'];

  @override
  void initState() {
    super.initState();
    fetchConfirmedBarangays();
  }

  @override
  void dispose() {
    _dobController.dispose(); // Clean up the controller when the widget is disposed
    super.dispose();
  }

  Future<void> fetchConfirmedBarangays() async {
   try{
       final snapshot = await FirebaseFirestore.instance
        .collection('barangays')
        .where('status', isEqualTo: 'active')
        .get();

    final barangayNames =
        snapshot.docs.map((doc) => doc['barangayName'] as String).toList();

    barangayNames.sort(); // Alphabetical

    setState(() {
      confirmedBarangays = barangayNames;
      isBarangayLoading = false;
    });
  } catch (e) {
    print('Error fetching barangays: $e');
    setState(() {
      isBarangayLoading = false;
    });
  }
  }

  String calculateAge(String dob) {
    try {
      final parts = dob.split('/');
      final birthDate = DateTime(int.parse(parts[2]), int.parse(parts[0]), int.parse(parts[1]));
      final today = DateTime.now();
      int age = today.year - birthDate.year;
      if (today.month < birthDate.month || (today.month == birthDate.month && today.day < birthDate.day)) {
        age--;
      }
      return age.toString();
    } catch (e) {
      return 'Unknown';
    }
  }

  Future<void> uploadProfilePhoto() async {
    if (profilePhoto == null) return;

    final fileName = '${DateTime.now().millisecondsSinceEpoch}_${profilePhoto!.path.split('/').last}';
    final storageRef = FirebaseStorage.instance.ref().child('profile_photos/$fileName');
    final uploadTask = await storageRef.putFile(profilePhoto!);
    profilePhotoUrl = await uploadTask.ref.getDownloadURL();
  }

  Widget _buildLoadingOverlay() {
    return Container(
      color: Colors.black.withOpacity(0.5),
      child: Center(
        child: Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
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
              const CircularProgressIndicator(
                valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF1848A0)),
              ),
              const SizedBox(height: 16),
              const Text(
                'Processing your registration...',
                style: TextStyle(
                  color: Color(0xFF333333),
                  fontSize: 16,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> saveToFirestore() async {
    try {
      setState(() {
        isLoading = true;
      });

      String age = calculateAge(dob);
      String fullName = '$firstName ${middleName.isNotEmpty ? '$middleName ' : ''}$lastName';
      String address = '$completeAddress, $barangay';

      await uploadProfilePhoto();

      // Check if the resident already exists in Firestore before adding them
      final querySnapshot = await FirebaseFirestore.instance
          .collection('residents')
          .where('contact', isEqualTo: contact)
          .get();

      if (querySnapshot.docs.isNotEmpty) {
        // User already exists, so we only update their status if needed
        final existingDoc = querySnapshot.docs.first;
        await existingDoc.reference.update({
          'status': 'pending',
          'fullName': fullName, // Update other details if necessary
        });
        // Update the SharedPreferences with new data
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('residentUID', existingDoc.id);
        await prefs.setString('fullName', fullName);
        await prefs.setString('status', 'pending');
        await prefs.setString('barangay', barangay);

        setState(() {
          isLoading = false;
        });

        showDialog(
          context: context,
          barrierDismissible: false,
          barrierColor: Colors.transparent,
          builder: (context) => const WaitingForApprovalScreen(),
        ).then((_) {
          if (mounted) {
            Navigator.pushNamedAndRemoveUntil(context, '/splash', (route) => false);
          }
        });
      } else {
        // New user registration
        final docRef = await FirebaseFirestore.instance.collection('residents').add({
          'firstName': firstName,
          'middleName': middleName,
          'lastName': lastName,
          'fullName': fullName,
          'dob': dob,
          'age': age,
          'gender': selectedGender,
          'contact': contact,
          'barangay': barangay,
          'completeAddress': completeAddress,
          'fullAddress': address,
          'emergencyContactName': emergencyContactName,
          'emergencyContactNumber': emergencyContactNumber,
          'profilePhotoUrl': profilePhotoUrl,
          'status': 'pending',
          'timestamp': FieldValue.serverTimestamp(),
        });

        final residentUID = docRef.id;

        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('residentUID', residentUID);
        await prefs.setString('fullName', fullName);
        await prefs.setString('status', 'pending');
        await prefs.setString('barangay', barangay);

        setState(() {
          isLoading = false;
        });

        showDialog(
          context: context,
          barrierDismissible: false,
          barrierColor: Colors.transparent,
          builder: (context) => const WaitingForApprovalScreen(),
        ).then((_) {
          if (mounted) {
            Navigator.pushReplacement(
              context,
              MaterialPageRoute(
                builder: (context) => Assistance(
                  fullName: "$firstName $middleName $lastName",
                  contact: contact,
                  gender: selectedGender!,
                  address: completeAddress,
                  age: calculateAge(dob).toString(),
                  barangay: barangay,
                  profileUrl: profilePhotoUrl ?? "",
                  emergencyContactName: emergencyContactName,
                  emergencyContactNumber: emergencyContactNumber,
                ),
              ),
            );
          }
        });
      }
    } catch (e) {
      setState(() {
        isLoading = false;
      });

      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text("Registration Failed"),
          content: Text("An error occured: $e"),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text("OK"),
            ),
          ],
        ),
      );
    }
  }

  Future<void> pickProfileImage() async {
    final picked = await ImagePicker().pickImage(source: ImageSource.gallery);
    if(picked != null) {
      setState(() {
        profilePhoto = File(picked.path);
      });
    }
  }

  // method to format the date input
  String _formatDate(String input) {
    // Remove any non-digit characters
    String digits = input.replaceAll(RegExp(r'[^\d]'), '');
    
    // Format the date as MM/DD/YYYY
    if (digits.length <= 2) {
      return digits;
    } else if (digits.length <= 4) {
      return '${digits.substring(0, 2)}/${digits.substring(2)}';
    } else {
      return '${digits.substring(0, 2)}/${digits.substring(2, 4)}/${digits.substring(4, min(8, digits.length))}';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          Container(
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
              child: Column(
                children: [
                  // Custom App Bar
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.1),
                          blurRadius: 8,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Row(
                      children: [
                        GestureDetector(
                          onTap: () => SystemNavigator.pop(),
                          child: Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: const Color(0xFF1848A0).withOpacity(0.1),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Icon(
                              Icons.arrow_back_ios_new,
                              color: Color(0xFF1848A0),
                              size: 20,
                            ),
                          ),
                        ),
                        const SizedBox(width: 16),
                        Image.asset(
                          'logo (1).png',
                          height: 40,
                        ),
                        const SizedBox(width: 12),
                        const Text(
                          'Registration',
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF1848A0),
                          ),
                        ),
                      ],
                    ),
                  ),
                  // Main Content
                  Expanded(
                    child: Stack(
                      children: [
                        // Background Pattern
                        Positioned.fill(
                          child: Opacity(
                            opacity: 0.05,
                            child: Image.asset(
                              'logo (1).png',
                              fit: BoxFit.contain,
                            ),
                          ),
                        ),
                        // Form Content
                        SingleChildScrollView(
                          padding: const EdgeInsets.all(16),
                          child: Form(
                            key: _formKey,
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                // Profile Photo Section
                                Center(
                                  child: GestureDetector(
                                    onTap: pickProfileImage,
                                    child: Container(
                                      width: 120,
                                      height: 120,
                                      decoration: BoxDecoration(
                                        color: Colors.white,
                                        borderRadius: BorderRadius.circular(60),
                                        boxShadow: [
                                          BoxShadow(
                                            color: Colors.black.withOpacity(0.1),
                                            blurRadius: 8,
                                            offset: const Offset(0, 2),
                                          ),
                                        ],
                                      ),
                                      child: profilePhoto != null
                                          ? ClipRRect(
                                              borderRadius: BorderRadius.circular(60),
                                              child: Image.file(
                                                profilePhoto!,
                                                fit: BoxFit.cover,
                                              ),
                                            )
                                          : Column(
                                              mainAxisAlignment: MainAxisAlignment.center,
                                              children: [
                                                Icon(
                                                  Icons.add_a_photo,
                                                  size: 32,
                                                  color: const Color(0xFF1848A0).withOpacity(0.5),
                                                ),
                                                const SizedBox(height: 8),
                                                Text(
                                                  'Add Photo',
                                                  style: TextStyle(
                                                    color: const Color(0xFF1848A0).withOpacity(0.5),
                                                    fontSize: 14,
                                                  ),
                                                ),
                                              ],
                                            ),
                                    ),
                                  ),
                                ),
                                const SizedBox(height: 24),
                                // Form Sections
                                _buildSection(
                                  "Personal Information",
                                  [
                                    _buildTextField(
                                      "First Name *",
                                      onSaved: (value) => firstName = value ?? '',
                                      validator: (value) => value?.isEmpty ?? true ? 'Required' : null,
                                    ),
                                    _buildTextField(
                                      "Middle Name",
                                      onSaved: (value) => middleName = value ?? '',
                                    ),
                                    _buildTextField(
                                      "Last Name *",
                                      onSaved: (value) => lastName = value ?? '',
                                      validator: (value) => value?.isEmpty ?? true ? 'Required' : null,
                                    ),
                                    _buildTextField(
                                      "Date of Birth *",
                                      hint: "MM/DD/YYYY",
                                      onSaved: (value) => dob = value ?? '',
                                      validator: (value) => value?.isEmpty ?? true ? 'Required' : null,
                                      controller: _dobController,
                                      onChanged: (value) {
                                        // Format the input as the user types
                                        String formatted = _formatDate(value);
                                        if (formatted != value) {
                                          _dobController.value = TextEditingValue(
                                            text: formatted,
                                            selection: TextSelection.collapsed(offset: formatted.length),
                                          );
                                        }
                                      },
                                    ),
                                    _buildDropdown(
                                      "Gender *",
                                      selectedGender,
                                      genders,
                                      (value) => setState(() => selectedGender = value),
                                      validator: (value) => value == null ? 'Required' : null,
                                    ),
                                    _buildTextField(
                                      "Contact Number *",
                                      inputType: TextInputType.phone,
                                      onSaved: (value) => contact = value ?? '',
                                      validator: (value) => value?.isEmpty ?? true ? 'Required' : null,
                                    ),
                                  ],
                                ),
                                _buildSection(
                                  "Address Details",
                                  [
                                    isBarangayLoading
                                        ? const Center(child: CircularProgressIndicator())
                                        : _buildDropdown(
                                            "Barangay *",
                                            barangay.isNotEmpty ? barangay : null,
                                            confirmedBarangays,
                                            (value) => setState(() => barangay = value!),
                                            validator: (value) => value == null || value.isEmpty ? 'Required' : null,
                                          ),
                                    _buildTextField(
                                      "Complete Address *",
                                      onSaved: (value) => completeAddress = value ?? '',
                                      validator: (value) => value?.isEmpty ?? true ? 'Required' : null,
                                    ),
                                  ],
                                ),
                                _buildSection(
                                  "Emergency Contact",
                                  [
                                    _buildTextField(
                                      "Contact Name *",
                                      onSaved: (value) => emergencyContactName = value ?? '',
                                      validator: (value) => value?.isEmpty ?? true ? 'Required' : null,
                                    ),
                                    _buildTextField(
                                      "Contact Number *",
                                      inputType: TextInputType.phone,
                                      onSaved: (value) => emergencyContactNumber = value ?? '',
                                      validator: (value) => value?.isEmpty ?? true ? 'Required' : null,
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 16),
                                // Required Fields Legend
                                Container(
                                  padding: const EdgeInsets.all(16),
                                  decoration: BoxDecoration(
                                    color: Colors.white.withOpacity(0.1),
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: Row(
                                    children: [
                                      Text(
                                        "* Required fields",
                                        style: TextStyle(
                                          color: Colors.white.withOpacity(0.9),
                                          fontSize: 14,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(height: 16),
                                // Agreement Checkbox
                                Container(
                                  padding: const EdgeInsets.all(16),
                                  decoration: BoxDecoration(
                                    color: Colors.white.withOpacity(0.1),
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: Row(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Transform.translate(
                                        offset: const Offset(0, -8),
                                        child: Checkbox(
                                          value: agreeToShare,
                                          onChanged: (val) => setState(() => agreeToShare = val ?? false),
                                          activeColor: const Color(0xFF1848A0),
                                        ),
                                      ),
                                      Expanded(
                                        child: Text(
                                          "I agree to share my information with RESQNECT for disaster response and emergency rescue operations.",
                                          style: TextStyle(
                                            color: Colors.white.withOpacity(0.9),
                                            fontSize: 14,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(height: 24),
                                // Action Buttons
                                Row(
                                  children: [
                                    Expanded(
                                      child: ElevatedButton(
                                        onPressed: () async {
                                          if (_formKey.currentState!.validate()) {
                                            if (!agreeToShare) {
                                              ScaffoldMessenger.of(context).showSnackBar(
                                                const SnackBar(
                                                  content: Text('Please agree to share your information.'),
                                                  backgroundColor: Colors.red,
                                                ),
                                              );
                                              return;
                                            }
                                            if (profilePhoto == null) {
                                              ScaffoldMessenger.of(context).showSnackBar(
                                                const SnackBar(
                                                  content: Text('Please add a profile photo.'),
                                                  backgroundColor: Colors.red,
                                                ),
                                              );
                                              return;
                                            }
                                            _formKey.currentState!.save();
                                            await saveToFirestore();
                                          }
                                        },
                                        style: ElevatedButton.styleFrom(
                                          backgroundColor: Colors.white,
                                          foregroundColor: const Color(0xFF1848A0),
                                          padding: const EdgeInsets.symmetric(vertical: 16),
                                          shape: RoundedRectangleBorder(
                                            borderRadius: BorderRadius.circular(12),
                                          ),
                                        ),
                                        child: const Text(
                                          'REGISTER',
                                          style: TextStyle(
                                            fontSize: 16,
                                            fontWeight: FontWeight.w600,
                                          ),
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: ElevatedButton(
                                        onPressed: () {
                                          // Clear all form fields
                                          setState(() {
                                            // Clear text fields
                                            firstName = '';
                                            middleName = '';
                                            lastName = '';
                                            dob = '';
                                            contact = '';
                                            barangay = '';
                                            completeAddress = '';
                                            emergencyContactName = '';
                                            emergencyContactNumber = '';
                                            selectedGender = null;
                                            profilePhoto = null;
                                            agreeToShare = false;
                                            
                                            // Clear the date of birth controller
                                            _dobController.clear();
                                            
                                            // Reset the form
                                            _formKey.currentState?.reset();
                                          });
                                        },
                                        style: ElevatedButton.styleFrom(
                                          backgroundColor: Colors.white.withOpacity(0.2),
                                          foregroundColor: Colors.white,
                                          padding: const EdgeInsets.symmetric(vertical: 16),
                                          shape: RoundedRectangleBorder(
                                            borderRadius: BorderRadius.circular(12),
                                          ),
                                        ),
                                        child: const Text(
                                          'CLEAR',
                                          style: TextStyle(
                                            fontSize: 16,
                                            fontWeight: FontWeight.w600,
                                          ),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 24),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          if (isLoading) _buildLoadingOverlay(),
        ],
      ),
    );
  }

  Widget _buildSection(String title, List<Widget> children) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 16),
          child: Text(
            title.toUpperCase(),
            style: TextStyle(
              color: Colors.white.withOpacity(0.9),
              fontSize: 16,
              fontWeight: FontWeight.w600,
              letterSpacing: 1,
            ),
          ),
        ),
        ...children,
      ],
    );
  }

  Widget _buildTextField(
    String label, {
    TextInputType inputType = TextInputType.text,
    String? hint,
    Function(String?)? onSaved,
    String? Function(String?)? validator,
    TextEditingController? controller,
    Function(String)? onChanged,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: TextFormField(
        controller: controller,
        keyboardType: inputType,
        onSaved: onSaved,
        onChanged: onChanged,
        validator: validator,
        style: const TextStyle(color: Colors.white),
        decoration: InputDecoration(
          labelText: label,
          hintText: hint,
          hintStyle: TextStyle(color: Colors.white.withOpacity(0.5)),
          labelStyle: TextStyle(color: Colors.white.withOpacity(0.7)),
          filled: true,
          fillColor: Colors.white.withOpacity(0.1),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide.none,
          ),
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        ),
      ),
    );
  }

  Widget _buildDropdown(
    String label,
    String? value,
    List<String> items,
    Function(String?) onChanged, {
    String? Function(String?)? validator,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: DropdownButtonFormField<String>(
        value: value,
        hint: Text(
          "Select $label",
          style: TextStyle(color: Colors.white.withOpacity(0.5)),
        ),
        items: items.map((item) {
          return DropdownMenuItem<String>(
            value: item,
            child: Text(
              item,
              style: const TextStyle(color: Colors.white),
            ),
          );
        }).toList(),
        onChanged: onChanged,
        validator: validator,
        dropdownColor: const Color(0xFF1848A0),
        style: const TextStyle(color: Colors.white),
        decoration: InputDecoration(
          labelText: label,
          labelStyle: TextStyle(color: Colors.white.withOpacity(0.7)),
          filled: true,
          fillColor: Colors.white.withOpacity(0.1),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide.none,
          ),
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        ),
      ),
    );
  }
}